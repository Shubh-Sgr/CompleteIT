import {prisma} from "../config/prisma.js";

const statusFor=(category:string,evidence?:string)=>evidence?"CONFIRMED":/(power|mount|adapter|charger)/.test(category)?"NEEDS_INFO":"LIKELY";
const label=(value:string)=>value.replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());
const words=(value:string)=>new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>word.length>2)??[]);

function categoriesMentioned(text:string,categories:any[]){
  const lower=text.toLowerCase();const textWords=words(text);
  return categories.map(category=>{const categoryTerms=words(`${category.slug} ${category.name}`);let score=0;if(lower.includes(category.name.toLowerCase())||lower.includes(category.slug.replaceAll("-"," ")))score+=10;else if(categoryTerms.size>1&&[...categoryTerms].every(term=>textWords.has(term)))score+=6;for(const product of category.products)if(lower.includes(product.name.toLowerCase()))score+=8;return {slug:category.slug,score}}).filter(value=>value.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(value=>value.slug);
}

export async function recommend(input:any,userId?:string,guestId?:string){
  const ownedProductIds=(input.ownedProductIds??[]) as string[];
  const detectedCategories=(input.detectedCategories??[]) as string[];
  const [owned,storedTemplate,categories]=await Promise.all([
    prisma.product.findMany({where:{id:{in:ownedProductIds}},include:{category:true}}),
    prisma.setTemplate.findFirst({where:{outcome:{name:input.outcome}},include:{outcome:true,slots:{orderBy:{priority:"asc"}}}}),
    prisma.productCategory.findMany({include:{products:{select:{name:true,brand:true}}}})
  ]);

  const ownedCategories=new Set<string>([...owned.map(p=>p.category.slug),...detectedCategories]);
  const explicitRequested=(input.desiredCategories??[]) as string[];const inferredRequested=categoriesMentioned(input.notes??"",categories).filter(slug=>!ownedCategories.has(slug));
  const requested=[...new Set<string>([...explicitRequested,...inferredRequested])].filter(slug=>typeof slug==="string"&&slug.trim().length>0).slice(0,12);
  const dynamic=!storedTemplate||storedTemplate.slots.length===0;
  const dynamicSlots=[
    ...[...ownedCategories].map((category,priority)=>({name:`Existing ${label(category)}`,purpose:"Keep a confirmed item that already contributes to this goal.",required:false,priority:priority+1,categories:[category],forceAddition:false})),
    ...requested.map((category,priority)=>({name:`Add ${label(category)}`,purpose:`Add a requested ${label(category)} item to move this custom goal forward.`,required:priority===0,priority:ownedCategories.size+priority+1,categories:[category],forceAddition:true})),
    ...(!ownedCategories.size&&!requested.length?[{name:"Define the next piece",purpose:"Add any planned item manually; the demo catalogue does not yet cover this custom goal.",required:false,priority:1,categories:[],forceAddition:true}]:[])
  ];
  const template:any=dynamic?{id:null,name:"Custom completion plan",description:`A flexible plan generated from your items and the goal “${input.outcome}”. Unknown categories stay editable instead of being forced into a technology template.`,slots:dynamicSlots}:storedTemplate;
  const used=new Set<string>(ownedProductIds);
  const completedSlots:any[]=[];const unfilledSlots:any[]=[];const internal:any[]=[];
  let remaining=input.budget as number;

  for(const slot of template.slots){
    const categories=Array.isArray(slot.categories)?slot.categories.filter((x:any):x is string=>typeof x==="string"):[];
    const ownedCategory=slot.forceAddition?undefined:categories.find((category:string)=>ownedCategories.has(category));
    if(ownedCategory){
      completedSlots.push({slotName:slot.name,category:ownedCategory,source:owned.some(p=>p.category.slug===ownedCategory)?"catalogue product":"confirmed object"});
      const duplicate=await prisma.product.findFirst({where:{category:{slug:ownedCategory},id:{notIn:[...used]}},include:{category:true},orderBy:[{rating:"desc"},{price:"asc"}]});
      if(duplicate)internal.push({product:duplicate,slotName:slot.name,section:"NOT_NEEDED",explanation:`You already cover ${slot.name.toLowerCase()} with ${label(ownedCategory)}.`,essentiality:"AVOID",compatibility:"LIKELY",confidence:.94,evidence:"The functional slot is already covered by confirmed ownership.",warning:"Buy only if this is an intentional replacement.",score:1,candidates:[duplicate]});
      continue;
    }

    const candidates=await prisma.product.findMany({where:{category:{slug:{in:categories}},id:{notIn:[...used]}},include:{category:true},orderBy:[{rating:"desc"},{price:"asc"}],take:15});
    const spaceFit=candidates.filter(product=>!input.widthCm||!product.widthCm||product.widthCm<=input.widthCm);
    const pool=spaceFit.length?spaceFit:candidates;
    if(!pool.length){unfilledSlots.push({slotName:slot.name,required:slot.required,reason:categories.length?`No matching demo products exist in ${categories.map(label).join(", ")}; add a custom planned item instead.`:"Describe or add the next item yourself; CompleteIt will preserve it without forcing a category.",categories});continue;}
    const withinBudget=pool.filter(product=>product.price<=remaining);
    const choice=(withinBudget.length?withinBudget:pool).sort((a,b)=>(b.rating*12-b.price/Math.max(1,input.budget))-(a.rating*12-a.price/Math.max(1,input.budget)))[0]!;
    const anchorIds=owned.map(p=>p.id);const edge=anchorIds.length?await prisma.compatibilityEdge.findFirst({where:{OR:[{fromId:{in:anchorIds},toId:choice.id},{fromId:choice.id,toId:{in:anchorIds}}]}}):null;
    const compatibility=edge?.status??statusFor(choice.category.slug,edge?.evidence);
    const overBudget=choice.price>remaining;const spaceWarning=input.widthCm&&choice.widthCm&&choice.widthCm>input.widthCm;
    const section=compatibility==="INCOMPATIBLE"?"INCOMPATIBLE":slot.required?"MISSING_ESSENTIALS":slot.priority<=6?"USEFUL_IMPROVEMENTS":"OPTIONAL_ADDITIONS";
    const essentiality=slot.required?"ESSENTIAL":slot.priority<=6?"USEFUL":"OPTIONAL";
    const warnings=[edge?.warning,overBudget?`This item exceeds the remaining budget by ₹${choice.price-remaining}.`:null,spaceWarning?`Its ${choice.widthCm} cm width exceeds the stated ${input.widthCm} cm space.`:null,compatibility==="NEEDS_INFO"?"Confirm exact connectors, load and dimensions before purchase.":null].filter(Boolean).join(" ")||null;
    internal.push({product:choice,slotName:slot.name,section,explanation:`${choice.name} fills ${slot.name.toLowerCase()}: ${slot.purpose}`,essentiality,compatibility,confidence:edge?.status==="CONFIRMED"?.96:compatibility==="NEEDS_INFO"?.62:.8,evidence:edge?.evidence??`Matched through the database template to ${choice.category.name}; exact-model evidence is not seeded.`,warning:warnings,score:slot.required?100-slot.priority:60-slot.priority,candidates:pool});
    used.add(choice.id);if(!overBudget)remaining-=choice.price;
  }

  const publicRecommendations=internal.map(({candidates:_,...item})=>item);
  const actionable=internal.filter(r=>!["NOT_NEEDED","INCOMPATIBLE"].includes(r.section));
  const anchorBrand=owned[0]?.brand;
  const variants=[
    {type:"OFFICIAL",label:"Same-brand path",pick:(r:any)=>anchorBrand?r.candidates.find((p:any)=>p.brand===anchorBrand):undefined,advantages:["Keeps the anchor brand where seeded products allow"],limitations:anchorBrand?["Missing needs remain empty when the anchor brand has no seeded option","Compatibility is claimed only with an evidence edge"]:["Add an exact anchor item to evaluate a same-brand path"]},
    {type:"MIXED",label:"Best-value path",pick:(r:any)=>[...r.candidates].sort((a:any,b:any)=>a.price-b.price)[0],advantages:["Lowest-price item per functional need","Brand-flexible"],limitations:["Verify exact product compatibility"]},
    {type:"COMMUNITY",label:"Community-rated path",pick:(r:any)=>[...r.candidates].sort((a:any,b:any)=>b.rating-a.rating||b.ratingCount-a.ratingCount)[0],advantages:["Uses the strongest seeded rating evidence","Shows usage uncertainty honestly"],limitations:["Seeded community evidence is a small demo sample"]}
  ];
  const alternatives=variants.map(variant=>{const products=actionable.map(variant.pick).filter(Boolean).filter((p:any,i:number,a:any[])=>a.findIndex(x=>x.id===p.id)===i);return {type:variant.type,label:variant.label,products,totalPrice:products.reduce((n:number,p:any)=>n+p.price,0),completedSlots:completedSlots.length+products.length,missingSlots:Math.max(0,template.slots.filter((s:any)=>s.required).length-completedSlots.length-products.length),compatibility:variant.type==="OFFICIAL"?"Only seeded evidence is treated as confirmed":"Likely; verify exact ports, loads and dimensions",communityRating:products.length?products.reduce((n:number,p:any)=>n+p.rating,0)/products.length:0,outcomeSuccess:Math.round((completedSlots.length+products.length)/Math.max(1,template.slots.length)*100),advantages:variant.advantages,limitations:variant.limitations};});
  const audit={completed:completedSlots.map(x=>x.slotName),completedSlots,missingRequired:[...publicRecommendations.filter(r=>r.section==="MISSING_ESSENTIALS").map(r=>r.slotName),...unfilledSlots.filter(x=>x.required).map(x=>x.slotName)],missingOptional:[...publicRecommendations.filter(r=>["USEFUL_IMPROVEMENTS","OPTIONAL_ADDITIONS"].includes(r.section)).map(r=>r.slotName),...unfilledSlots.filter(x=>!x.required).map(x=>x.slotName)],duplicates:publicRecommendations.filter(r=>r.section==="NOT_NEEDED").map(r=>r.product.name),incompatible:publicRecommendations.filter(r=>r.section==="INCOMPATIBLE").map(r=>r.product.name),unfilledSlots};
  const result={template:{id:template.id,name:template.name,description:template.description,totalSlots:template.slots.length,dynamic},owned,recommendations:publicRecommendations,alternatives,budget:input.budget,remainingBudget:Math.max(0,remaining),audit,assumptions:["Catalogue prices are demo values; any uncatalogued item can be added manually.","Unseeded exact-product compatibility remains likely or needs information.",input.widthCm?`Items with known width were checked against ${input.widthCm} cm.`:"No size limit was supplied."]};
  const session=await prisma.recommendationSession.create({data:{userId,guestId,input,result:JSON.parse(JSON.stringify(result)),recommendations:{create:publicRecommendations.map(r=>({productId:r.product.id,slotName:r.slotName,section:r.section,explanation:r.explanation,essentiality:r.essentiality,compatibility:r.compatibility,confidence:r.confidence,evidence:r.evidence,warning:r.warning,score:r.score}))}}});
  return {...result,sessionId:session.id};
}
