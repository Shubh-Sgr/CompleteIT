import {randomUUID} from "node:crypto";
import slugify from "slugify";
import {prisma} from "../config/prisma.js";
import {AppError} from "../errors/AppError.js";
import {getVisibleSet,requireSetOwner,setInclude} from "../repositories/setRepository.js";

export async function createSet(userId:string,input:any,database:any=prisma){
  const catalogueProducts:any[]=await database.product.findMany({where:{id:{in:input.items.map((item:any)=>item.productId)}}});
  const byId=new Map<string,any>(catalogueProducts.map((product:any)=>[product.id,product]));
  const normalizedItems=input.items.filter((item:any)=>byId.has(item.productId)).map((item:any)=>({productId:item.productId,slotName:item.slotName,owned:item.owned,selectedPrice:byId.get(item.productId)!.price,notes:item.notes??"",addedById:userId,attribution:"Original creator"}));

  for(const [index,item] of (input.manualItems??[]).entries()){
    const categorySlug=slugify(item.category||item.label,{lower:true,strict:true})||"other";
    const categoryName=(item.category||"Other").trim();
    const category=await database.productCategory.upsert({where:{slug:categorySlug},update:{},create:{slug:categorySlug,name:categoryName}});
    const product=await database.product.create({data:{sku:`USER-${randomUUID()}`,name:item.label.trim(),brand:item.brand?.trim()||"User-provided",categoryId:category.id,price:item.price??0,description:"A user-provided product retained from manual set creation.",demo:false,custom:true,verified:false,metadata:{source:"manual-creation",createdBy:userId}}});
    normalizedItems.push({productId:product.id,slotName:item.slotName||`Manual item ${index+1}`,owned:item.owned??true,selectedPrice:product.price,notes:item.notes??"",addedById:userId,attribution:"Added manually by the original creator"});
  }

  const title=input.title;
  return database.productSet.create({data:{ownerId:userId,title,slug:`${slugify(title,{lower:true,strict:true})}-${Date.now().toString(36)}`,description:input.description,outcome:input.outcome,budget:input.budget,visibility:input.visibility??"PRIVATE",status:"DRAFT",setType:(input.manualItems?.length?"MANUAL":undefined),anchorProductId:input.anchorProductId,templateId:input.templateId,totalPrice:normalizedItems.reduce((total:number,item:{selectedPrice:number})=>total+item.selectedPrice,0),items:{create:normalizedItems}},include:setInclude});
}

export async function publishSet(slug:string,userId:string,visibility="PUBLIC"){
  const set=await requireSetOwner(slug,userId);
  if(!["PUBLIC","UNLISTED","FOLLOWERS","PRIVATE"].includes(visibility))throw new AppError(400,"Invalid visibility");
  const updated=await prisma.productSet.update({where:{id:set.id},data:{visibility:visibility as any,status:visibility==="PRIVATE"?"DRAFT":"ACTIVE"}});
  if(visibility==="PUBLIC"&&set.visibility!=="PUBLIC")await prisma.feedEvent.create({data:{actorId:userId,setId:set.id,type:"SET_PUBLISHED",title:`${set.title} was published`,detail:"A new public set is ready to explore."}});
  return updated;
}

export async function forkSet(slug:string,userId:string){
  const source=await getVisibleSet(slug,userId);
  if(source.visibility!=="PUBLIC")throw new AppError(403,"Only public sets can be forked","FORK_NOT_ALLOWED");
  return prisma.$transaction(async tx=>{const fork=await tx.productSet.create({data:{ownerId:userId,title:`${source.title} — my fork`,slug:`${source.slug}-fork-${Date.now().toString(36)}`,description:source.description,outcome:source.outcome,budget:source.budget,constraints:source.constraints as any,setType:"FORK",visibility:"PRIVATE",status:"DRAFT",totalPrice:source.totalPrice,slotScore:source.slotScore,compatibilityScore:source.compatibilityScore,valueScore:source.valueScore,communityRating:0,outcomeSuccess:0,usageDays:0,templateId:source.templateId,anchorProductId:source.anchorProductId,forkedFromId:source.id,slots:{create:source.slots.map(slot=>({name:slot.name,purpose:slot.purpose,required:slot.required,priority:slot.priority,status:slot.status}))},items:{create:source.items.map(item=>({productId:item.productId,slotName:item.slotName,owned:false,selectedPrice:item.selectedPrice,notes:item.notes,addedById:userId,attribution:`Forked from ${source.owner.username}/${source.slug}`}))}}});await tx.productSetFork.create({data:{sourceId:source.id,forkId:fork.id,userId,attribution:`Forked from ${source.owner.username}/${source.slug}`}});await tx.feedEvent.create({data:{actorId:userId,setId:source.id,type:"SET_FORKED",title:`A fork of ${source.title} was created`,detail:"The original creator remains permanently attributed."}});return fork;});
}

export async function copySet(slug:string,userId:string){
  const source=await getVisibleSet(slug,userId);
  if(source.ownerId===userId)throw new AppError(400,"You already own this set");
  return prisma.productSet.create({data:{ownerId:userId,title:`${source.title} — private copy`,slug:`${source.slug}-copy-${Date.now().toString(36)}`,description:source.description,outcome:source.outcome,budget:source.budget,constraints:source.constraints as any,setType:"MANUAL",visibility:"PRIVATE",status:"DRAFT",totalPrice:source.totalPrice,slotScore:source.slotScore,compatibilityScore:source.compatibilityScore,valueScore:source.valueScore,communityRating:0,outcomeSuccess:0,usageDays:0,templateId:source.templateId,anchorProductId:source.anchorProductId,slots:{create:source.slots.map(slot=>({name:slot.name,purpose:slot.purpose,required:slot.required,priority:slot.priority,status:slot.status}))},items:{create:source.items.map(item=>({productId:item.productId,slotName:item.slotName,owned:false,selectedPrice:item.selectedPrice,notes:item.notes,addedById:userId,attribution:`Copied from ${source.owner.username}/${source.slug}`}))}},include:setInclude});
}

export async function updateSet(slug:string,userId:string,input:any){
  const set=await requireSetOwner(slug,userId);
  return prisma.productSet.update({where:{id:set.id},data:input,include:setInclude});
}

export async function addSetItem(slug:string,userId:string,input:any){
  const set=await requireSetOwner(slug,userId);
  const product=await prisma.product.findUnique({where:{id:input.productId}});
  if(!product)throw new AppError(404,"Product not found","PRODUCT_NOT_FOUND");
  await prisma.productSetItem.create({data:{setId:set.id,productId:product.id,slotName:input.slotName,owned:input.owned,selectedPrice:product.price,notes:input.notes??"",addedById:userId,attribution:"Added by set owner"}});
  return prisma.productSet.update({where:{id:set.id},data:{totalPrice:{increment:product.price}},include:setInclude});
}

export async function removeSetItem(slug:string,userId:string,itemId:string){
  const set=await requireSetOwner(slug,userId);
  const item=await prisma.productSetItem.findFirst({where:{id:itemId,setId:set.id}});
  if(!item)throw new AppError(404,"Set item not found","SET_ITEM_NOT_FOUND");
  await prisma.productSetItem.delete({where:{id:item.id}});
  return prisma.productSet.update({where:{id:set.id},data:{totalPrice:{decrement:item.selectedPrice}},include:setInclude});
}

export async function updateSetItemProgress(slug:string,userId:string,itemId:string,owned:boolean){
  const set=await requireSetOwner(slug,userId);
  const item=await prisma.productSetItem.findFirst({where:{id:itemId,setId:set.id}});
  if(!item)throw new AppError(404,"Set item not found","SET_ITEM_NOT_FOUND");
  await prisma.productSetItem.update({where:{id:item.id},data:{owned}});
  const items=await prisma.productSetItem.findMany({where:{setId:set.id},select:{owned:true}});
  const allOwned=items.length>0&&items.every(value=>value.owned);
  await prisma.productSet.update({where:{id:set.id},data:{status:allOwned?"COMPLETED":set.status==="COMPLETED"?(set.visibility==="PRIVATE"?"DRAFT":"ACTIVE"):undefined}});
  return prisma.productSet.findUniqueOrThrow({where:{id:set.id},include:setInclude});
}

export async function swapItem(slug:string,userId:string,itemId:string,replacementId:string){
  const set=await requireSetOwner(slug,userId);const item=await prisma.productSetItem.findFirst({where:{id:itemId,setId:set.id},include:{product:true}});const replacement=await prisma.product.findUnique({where:{id:replacementId}});if(!item||!replacement)throw new AppError(404,"Item or replacement not found");const edge=await prisma.compatibilityEdge.findFirst({where:{OR:[{fromId:set.anchorProductId??"",toId:replacement.id},{fromId:replacement.id,toId:set.anchorProductId??""}]}});const priceDifference=replacement.price-item.selectedPrice;await prisma.productSetItem.update({where:{id:item.id},data:{productId:replacement.id,selectedPrice:replacement.price,attribution:item.attribution??"Swapped by set owner"}});await prisma.productSet.update({where:{id:set.id},data:{totalPrice:{increment:priceDifference}}});return {before:item.product,after:replacement,impact:{priceDifference,compatibilityDifference:edge?.status??"NEEDS_INFO",slotCompletionDifference:0,spaceImpact:replacement.widthCm&&item.product.widthCm?replacement.widthCm-item.product.widthCm:null,communityRatingDifference:replacement.rating-item.product.rating,outcomeScoreDifference:Math.round((replacement.rating-item.product.rating)*2)}};
}
