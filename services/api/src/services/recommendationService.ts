import {prisma} from "../config/prisma.js";
import {planGoalWithGemini} from "./geminiRecommendationService.js";

const statusFor=(category:string,evidence?:string)=>evidence?"CONFIRMED":/(power|mount|adapter|charger)/.test(category)?"NEEDS_INFO":"LIKELY";
const label=(value:string)=>value.replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());
const words=(value:string)=>new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>word.length>2)??[]);
const normalized=(value:string)=>[...words(value)].join(" ");

function categoriesMentioned(text:string,categories:any[]){
  const lower=text.toLowerCase();const textWords=words(text);
  return categories.map(category=>{const categoryTerms=words(`${category.slug} ${category.name}`);let score=0;if(lower.includes(category.name.toLowerCase())||lower.includes(category.slug.replaceAll("-"," ")))score+=10;else if(categoryTerms.size>1&&[...categoryTerms].every(term=>textWords.has(term)))score+=6;for(const product of category.products)if(lower.includes(product.name.toLowerCase()))score+=8;return {slug:category.slug,score}}).filter(value=>value.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(value=>value.slug);
}

function likelySameItem(left:string,right:string){
  const a=normalized(left),b=normalized(right);if(!a||!b)return false;if(a===b||a.includes(b)||b.includes(a))return true;
  const aw=words(a),bw=words(b),shared=[...aw].filter(word=>bw.has(word)).length;
  return shared>=2&&shared/Math.max(aw.size,bw.size)>=.6;
}

function goalFit(product:any,slot:any){
  const target=words(`${slot.name} ${slot.purpose}`);const candidate=words(`${product.name} ${product.brand} ${product.category?.name??""}`);
  return [...target].filter(word=>candidate.has(word)).length;
}

export async function recommend(input:any,userId?:string,guestId?:string){
  const ownedProductIds=(input.ownedProductIds??[]) as string[];
  const detectedCategories=(input.detectedCategories??[]) as string[];
  const suppliedOwned=(input.ownedItems??[]) as Array<{label:string;category:string;brand?:string}>;
  const suppliedPlanned=(input.plannedItems??[]) as Array<{label:string;category:string;brand?:string}>;
  const [owned,storedTemplate,categories]=await Promise.all([
    prisma.product.findMany({where:{id:{in:ownedProductIds}},include:{category:true}}),
    prisma.setTemplate.findFirst({where:{outcome:{name:input.outcome}},include:{outcome:true,slots:{orderBy:{priority:"asc"}}}}),
    prisma.productCategory.findMany({include:{products:{where:{custom:false},select:{name:true,brand:true}}}})
  ]);

  const ownedItems=[...suppliedOwned,...owned.map(product=>({label:product.name,category:product.category.slug}))].filter((item,index,all)=>all.findIndex(value=>likelySameItem(value.label,item.label))===index);
  const ownedCategories=new Set<string>([...owned.map(product=>product.category.slug),...detectedCategories,...ownedItems.map(item=>item.category)]);
  const explicitRequested=(input.desiredCategories??[]) as string[];
  const inferredRequested=categoriesMentioned([input.outcome,input.notes].filter(Boolean).join(". "),categories);
  const requested=[...new Set<string>([...explicitRequested,...inferredRequested])].filter(slug=>typeof slug==="string"&&slug.trim().length>0).slice(0,12);
  const dynamic=!storedTemplate||storedTemplate.slots.length===0;
  const goalPlan=dynamic?await planGoalWithGemini({outcome:input.outcome,notes:input.notes,budget:input.budget,preference:input.preference,ownedItems,plannedItems:suppliedPlanned,categories}):null;
  const reservedLabels=[...ownedItems,...suppliedPlanned].map(item=>item.label);
  const aiSuggestions=(goalPlan?.suggestions??[]).filter(suggestion=>!reservedLabels.some(item=>likelySameItem(item,suggestion.label)));
  const plannedCategories=new Set(aiSuggestions.map(suggestion=>suggestion.category));
  const fallbackRequests=requested.filter(category=>!plannedCategories.has(category));
  const dynamicSlots=[
    ...[...ownedCategories].map((category,priority)=>({name:`Existing ${label(category)}`,purpose:"Keep a confirmed item that already contributes to this goal.",required:false,priority:priority+1,categories:[category],forceAddition:false,source:"owned"})),
    ...aiSuggestions.map((suggestion,priority)=>({name:suggestion.label,purpose:suggestion.reason,required:suggestion.priority==="ESSENTIAL",priority:ownedCategories.size+priority+1,categories:[suggestion.category],forceAddition:true,source:"ai",aiPriority:suggestion.priority})),
    ...fallbackRequests.map((category,priority)=>({name:`Add ${label(category)}`,purpose:`Add a requested ${label(category)} item to move this custom goal forward.`,required:priority===0,priority:ownedCategories.size+aiSuggestions.length+priority+1,categories:[category],forceAddition:true,source:"rules"})),
    ...(!ownedCategories.size&&!aiSuggestions.length&&!fallbackRequests.length?[{name:"Define the next piece",purpose:"Add any planned item manually; the catalogue does not yet cover this custom goal.",required:false,priority:1,categories:[],forceAddition:true,source:"rules"}]:[])
  ];
  const template:any=dynamic?{id:null,name:"Custom completion plan",description:`A flexible AI-assisted plan built around “${input.outcome}”. It keeps confirmed items, looks for meaningful gaps, and preserves uncatalogued suggestions as editable items.`,slots:dynamicSlots}:storedTemplate;
  const used=new Set<string>(ownedProductIds);
  const completedSlots:any[]=[];const unfilledSlots:any[]=[];const internal:any[]=[];
  let remaining=input.budget as number;

  for(const slot of template.slots){
    const slotCategories=Array.isArray(slot.categories)?slot.categories.filter((value:any):value is string=>typeof value==="string"):[];
    const ownedCategory=slot.forceAddition?undefined:slotCategories.find((category:string)=>ownedCategories.has(category));
    if(ownedCategory){
      completedSlots.push({slotName:slot.name,category:ownedCategory,source:owned.some(product=>product.category.slug===ownedCategory)?"catalogue product":"confirmed object"});
      continue;
    }

    const candidates=await prisma.product.findMany({where:{custom:false,category:{slug:{in:slotCategories}},id:{notIn:[...used]}},include:{category:true},orderBy:[{rating:"desc"},{price:"asc"}],take:20});
    const distinct=candidates.filter(product=>!reservedLabels.some(item=>likelySameItem(item,product.name)));
    const spaceFit=distinct.filter(product=>!input.widthCm||!product.widthCm||product.widthCm<=input.widthCm);
    const ranked=(spaceFit.length?spaceFit:distinct).sort((a,b)=>goalFit(b,slot)-goalFit(a,slot)||b.rating-a.rating||a.price-b.price);
    const strongestFit=ranked[0]?goalFit(ranked[0],slot):0;
    if(slot.source==="ai"&&strongestFit<2){unfilledSlots.push({slotName:slot.name,required:slot.required,reason:slot.purpose,categories:slotCategories,source:slot.source,priority:slot.aiPriority??(slot.required?"ESSENTIAL":"USEFUL")});continue;}
    const pool=slot.source==="ai"?ranked.filter(product=>goalFit(product,slot)===strongestFit):ranked;
    if(!pool.length){unfilledSlots.push({slotName:slot.name,required:slot.required,reason:slot.purpose,categories:slotCategories,source:slot.source??"template",priority:slot.aiPriority??(slot.required?"ESSENTIAL":"USEFUL")});continue;}
    const withinBudget=input.budget>0?pool.filter(product=>product.price<=remaining):pool;
    const choice=(withinBudget.length?withinBudget:pool)[0]!;
    const anchorIds=owned.map(product=>product.id);const edge=anchorIds.length?await prisma.compatibilityEdge.findFirst({where:{OR:[{fromId:{in:anchorIds},toId:choice.id},{fromId:choice.id,toId:{in:anchorIds}}]}}):null;
    const compatibility=edge?.status??statusFor(choice.category.slug,edge?.evidence);
    const overBudget=input.budget>0&&choice.price>remaining;const spaceWarning=input.widthCm&&choice.widthCm&&choice.widthCm>input.widthCm;
    const section=compatibility==="INCOMPATIBLE"?"INCOMPATIBLE":slot.required?"MISSING_ESSENTIALS":slot.priority<=6?"USEFUL_IMPROVEMENTS":"OPTIONAL_ADDITIONS";
    const essentiality=slot.aiPriority??(slot.required?"ESSENTIAL":slot.priority<=6?"USEFUL":"OPTIONAL");
    const warnings=[edge?.warning,overBudget?`This item exceeds the remaining budget by ₹${choice.price-remaining}.`:null,spaceWarning?`Its ${choice.widthCm} cm width exceeds the stated ${input.widthCm} cm space.`:null,compatibility==="NEEDS_INFO"?"Confirm exact connectors, load and dimensions before purchase.":null].filter(Boolean).join(" ")||null;
    internal.push({product:choice,slotName:slot.name,section,explanation:`${choice.name} supports “${input.outcome}”: ${slot.purpose}`,essentiality,compatibility,confidence:edge?.status==="CONFIRMED"?.96:compatibility==="NEEDS_INFO"?.62:.8,evidence:edge?.evidence??`Matched the goal-planned need to ${choice.category.name}; exact-model evidence is not seeded.`,warning:warnings,score:slot.required?100-slot.priority:60-slot.priority,candidates:pool});
    used.add(choice.id);if(input.budget>0&&!overBudget)remaining-=choice.price;
  }

  const publicRecommendations=internal.map(({candidates:_,...item})=>item);
  const actionable=internal.filter(row=>!["NOT_NEEDED","INCOMPATIBLE"].includes(row.section));
  const anchorBrand=owned[0]?.brand;
  const variants=[
    {type:"OFFICIAL",label:"Same-brand path",rank:(products:any[])=>anchorBrand?products.filter(product=>product.brand===anchorBrand):[],advantages:["Keeps the anchor brand where catalogue products allow"],limitations:anchorBrand?["Some needs stay open when that brand has no matching catalogue item","Exact compatibility still needs evidence"]:["Choose an exact catalogue anchor item to compare one-brand options"]},
    {type:"MIXED",label:"Best-value path",rank:(products:any[])=>[...products].sort((a,b)=>a.price-b.price),advantages:["Chooses the lowest-priced catalogue match for each need","Can mix brands and categories"],limitations:["Verify exact product suitability before purchase"]},
    {type:"COMMUNITY",label:"Top-rated path",rank:(products:any[])=>[...products].sort((a,b)=>b.rating-a.rating||b.ratingCount-a.ratingCount),advantages:["Prioritizes the strongest catalogue rating evidence","Keeps the goal-specific need list"],limitations:["Catalogue ratings are a limited demo sample"]}
  ];
  const alternatives=variants.map(variant=>{
    const chosen=new Set<string>();const items:any[]=[];
    for(const row of actionable){const product=variant.rank(row.candidates).find((candidate:any)=>!chosen.has(candidate.id));if(!product)continue;chosen.add(product.id);items.push({...publicRecommendations.find(item=>item.slotName===row.slotName),product,explanation:`${product.name} is the ${variant.label.toLowerCase()} choice for ${row.slotName.toLowerCase()}: ${row.explanation.split(": ").slice(1).join(": ")||row.explanation}`});}
    const products=items.map(item=>item.product);const covered=completedSlots.length+items.length;
    return {type:variant.type,label:variant.label,items,products,totalPrice:products.reduce((total:number,product:any)=>total+product.price,0),completedSlots:covered,missingSlots:Math.max(0,template.slots.length-covered),compatibility:variant.type==="OFFICIAL"?"Only seeded evidence is treated as confirmed":"Likely; verify exact suitability and dimensions",communityRating:products.length?products.reduce((total:number,product:any)=>total+product.rating,0)/products.length:0,outcomeSuccess:Math.min(100,Math.round(covered/Math.max(1,template.slots.length)*100)),advantages:variant.advantages,limitations:variant.limitations};
  });
  const audit={completed:completedSlots.map(item=>item.slotName),completedSlots,missingRequired:[...publicRecommendations.filter(row=>row.section==="MISSING_ESSENTIALS").map(row=>row.slotName),...unfilledSlots.filter(item=>item.required).map(item=>item.slotName)],missingOptional:[...publicRecommendations.filter(row=>["USEFUL_IMPROVEMENTS","OPTIONAL_ADDITIONS"].includes(row.section)).map(row=>row.slotName),...unfilledSlots.filter(item=>!item.required).map(item=>item.slotName)],duplicates:publicRecommendations.filter(row=>row.section==="NOT_NEEDED").map(row=>row.product.name),incompatible:publicRecommendations.filter(row=>row.section==="INCOMPATIBLE").map(row=>row.product.name),unfilledSlots};
  const customSuggestions=unfilledSlots.filter(item=>item.source==="ai").map(item=>({label:item.slotName,category:item.categories[0]??"uncategorized",reason:item.reason,priority:item.priority}));
  const planning={provider:goalPlan?.provider??"goal-and-catalogue-rules",summary:goalPlan?.summary??"The goal text was checked against the available catalogue and the items you confirmed.",insights:goalPlan?.insights??["Suggestions are limited to catalogue matches; uncatalogued items stay editable instead of being replaced with unrelated products."],suggestions:aiSuggestions};
  const result={template:{id:template.id,name:template.name,description:template.description,totalSlots:template.slots.length,dynamic},planning,customSuggestions,owned,recommendations:publicRecommendations,alternatives,budget:input.budget,remainingBudget:input.budget>0?Math.max(0,remaining):0,audit,assumptions:[goalPlan?"Gemini used the stated goal and confirmed items to identify possible gaps.":"Gemini planning was unavailable, so the goal and catalogue category matcher were used.","Catalogue prices are demo values; any uncatalogued item can be added manually.","Unseeded exact-product compatibility remains likely or needs information.",input.widthCm?`Items with known width were checked against ${input.widthCm} cm.`:"No size limit was supplied."]};
  const session=await prisma.recommendationSession.create({data:{userId,guestId,input,result:JSON.parse(JSON.stringify(result)),recommendations:{create:publicRecommendations.map(row=>({productId:row.product.id,slotName:row.slotName,section:row.section,explanation:row.explanation,essentiality:row.essentiality,compatibility:row.compatibility,confidence:row.confidence,evidence:row.evidence,warning:row.warning,score:row.score}))}}});
  return {...result,sessionId:session.id};
}
