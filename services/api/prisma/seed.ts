import { PrismaClient, SetType, Visibility } from "@prisma/client";
import argon2 from "argon2";
import {addGenericData} from "./generic-data.js";

const prisma = new PrismaClient();
const password = "CompleteIt@123";
const catalogue: Record<string, Array<[string,string,number]>> = {
  laptops: [["AeroBook 13","Orbit",44990],["StudyBook 14","Nexa",32990],["GameLite 15","Volt",57990],["AirNote M1","Pear",54900],["ReNew Think 14","ReUse",24990]],
  displays: [["FocusView 24","Orbit",8999],["CreatorView 27","Nexa",15499],["GameView 144Hz","Volt",16999],["PortableView 15","Nomad",10999],["MiniView 22","ValueLab",6499]],
  keyboards: [["QuietKeys","Keyworks",1299],["Compact 68","Keyworks",2399],["MechLite TKL","Volt",3199],["ErgoSplit Mini","Nexa",4499],["Reuse Wireless Keys","ReUse",899]],
  mice: [["Silent Mouse","Keyworks",699],["Ergo Mouse","Nexa",1499],["GameMouse 8K","Volt",2499],["Travel Mouse","Nomad",799],["Trackball Mini","Orbit",2199]],
  "laptop-stands": [["Aluminium Rise","Deskly",1299],["Fold Stand","Nomad",699],["Tall Ergo Stand","Nexa",1899],["Ventilated Stand","Volt",1599],["Wood Stand","CraftRoom",999]],
  desks: [["Study Desk 100","RoomRoot",4999],["Compact Desk 80","RoomRoot",3499],["Standing Desk Lite","Nexa",15999],["Foldaway Desk","Nomad",2899],["Gaming Desk 120","Volt",8999]],
  chairs: [["Study Chair","RoomRoot",3999],["Ergo Chair Lite","Nexa",8499],["Mesh Task Chair","Deskly",6499],["Fold Chair","Nomad",1799],["Gaming Chair Core","Volt",10999]],
  power: [["Surge Strip 6","SafeCurrent",999],["USB-C 65W Charger","Orbit",2199],["Mini UPS Router","SafeCurrent",2799],["Cable Box","TidyLab",599],["Power Strip 3","ValueLab",449]],
  audio: [["Study Buds","Sonic",1499],["Desk Speakers Mini","Sonic",2499],["Gaming Headset","Volt",3299],["USB Mic Mini","Sonic",2799],["Noise Guard Headphones","Nexa",5999]],
  lighting: [["Task Lamp","Glow",999],["Monitor Light Bar","Glow",2499],["Warm Floor Lamp","RoomRoot",1999],["RGB Desk Strip","Volt",1199],["Rechargeable Lamp","Nomad",799]],
  storage: [["Desk Drawer","TidyLab",1299],["3-Tier Shelf","RoomRoot",2499],["Underbed Box Pair","TidyLab",1199],["Laptop Sleeve","Nomad",899],["SSD 1TB","Orbit",5499]],
  "bedroom-furniture": [["Single Cot","RoomRoot",7499],["Foam Mattress","Restful",5999],["Bedside Table","RoomRoot",1899],["Fold Mattress","Nomad",3499],["Privacy Screen","HostelMate",2199]],
  organization: [["Pegboard Kit","TidyLab",1499],["Cable Clips 12","TidyLab",299],["Drawer Dividers","TidyLab",499],["Hanging Organizer","HostelMate",699],["Storage Ottoman","RoomRoot",1899]],
  gaming: [["Controller Core","Volt",2499],["Desk Mat XL","Volt",799],["Cooling Pad","Volt",1799],["Webcam 1080","Orbit",2199],["USB Hub 7","Orbit",1699]],
  protection: [["Voltage Protector","SafeCurrent",899],["Keyboard Cover","ValueLab",299],["Screen Cleaning Kit","TidyLab",349],["Laptop Lock","SafeCurrent",799],["Fire-safe Cable Sleeve","SafeCurrent",599]]
};

const outcomes = ["Build a study setup","Create a work-from-home setup","Complete a gaming setup","Improve ergonomics","Organize a small room","Prepare a hostel room","Upgrade an existing setup","Reduce total cost","Improve appearance","Find compatible accessories"];
const slotMap = [
  ["Computer","The primary computing device",true,["laptops"]], ["Power","Safe and reliable power",true,["power"]],
  ["Input","Keyboard and pointing input",true,["keyboards","mice"]], ["Ergonomics","Healthy working posture",true,["chairs","laptop-stands"]],
  ["Protection","Protect equipment and user",true,["protection"]], ["Display","Additional visual workspace",false,["displays"]],
  ["Audio","Private or shared sound",false,["audio"]], ["Storage","Store files or equipment",false,["storage"]],
  ["Lighting","Focused illumination",false,["lighting"]], ["Cable management","Keep cables safe and tidy",false,["organization","power"]]
] as const;

async function main() {
  await prisma.moderationAction.deleteMany(); await prisma.report.deleteMany(); await prisma.notification.deleteMany();
  await prisma.feedEvent.deleteMany(); await prisma.compatibilityEdge.deleteMany(); await prisma.helpfulVote.deleteMany();
  await prisma.comment.deleteMany(); await prisma.productSuggestion.deleteMany(); await prisma.productRating.deleteMany(); await prisma.setRating.deleteMany();
  await prisma.setUpdate.deleteMany(); await prisma.productSetFork.deleteMany(); await prisma.productSetFollow.deleteMany(); await prisma.productSetItem.deleteMany(); await prisma.productSetSlot.deleteMany(); await prisma.productSet.deleteMany();
  await prisma.recommendation.deleteMany(); await prisma.recommendationSession.deleteMany(); await prisma.complementRule.deleteMany(); await prisma.setSlotDefinition.deleteMany(); await prisma.setTemplate.deleteMany(); await prisma.outcome.deleteMany();
  await prisma.productWorld.deleteMany(); await prisma.productFollow.deleteMany(); await prisma.productImage.deleteMany(); await prisma.product.deleteMany(); await prisma.productCategory.deleteMany();
  await prisma.topicFollow.deleteMany(); await prisma.topic.deleteMany(); await prisma.userFollow.deleteMany(); await prisma.userBlock.deleteMany(); await prisma.userProfile.deleteMany(); await prisma.user.deleteMany();

  const users = [];
  const people = [["aisha@completeit.local","aisha","Aisha Khan"],["rohan@completeit.local","rohan","Rohan Mehta"],["meera@completeit.local","meera","Meera Iyer"],["kabir@completeit.local","kabir","Kabir Singh"],["admin@completeit.local","admin","Demo Moderator"]];
  const passwordHash = await argon2.hash(password);
  for (const [email,username,displayName] of people) users.push(await prisma.user.create({data:{email,username,passwordHash,emailVerifiedAt:new Date(),profile:{create:{displayName,bio:`${displayName}'s practical spaces and long-term setup notes.`}}}}));

  const categories: Record<string,string> = {};
  const products = [];
  let sku = 1;
  for (const [slug, rows] of Object.entries(catalogue)) {
    const category = await prisma.productCategory.create({data:{slug,name:slug.split("-").map(x=>x[0]!.toUpperCase()+x.slice(1)).join(" ")}}); categories[slug]=category.id;
    for (const [name,brand,price] of rows) products.push(await prisma.product.create({data:{sku:`DEMO-${String(sku++).padStart(3,"0")}`,name,brand,categoryId:category.id,price,description:`Demo ${name} for locally evaluated setup combinations.`,widthCm:slug==="desks"?Number(name.match(/\d+/)?.[0]??80):undefined,depthCm:slug==="desks"?55:undefined,rating:3.8+(sku%10)/10,ratingCount:4+(sku%17),metadata:{demoMerchant:"CompleteIt Demo Store",stock:"demo"}}}));
  }

  const outcomeRows=[]; for(const name of outcomes) outcomeRows.push(await prisma.outcome.create({data:{name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),description:`Outcome template for ${name.toLowerCase()}.`}}));
  const workTemplate=await prisma.setTemplate.create({data:{slug:"workstation",name:"Complete workstation",description:"Core and optional slots for study and work outcomes",outcomeId:outcomeRows[0]!.id,slots:{create:slotMap.map(([name,purpose,required,cats],priority)=>({name,purpose,required,priority:priority+1,categories:[...cats],constraints:{}}))}}});
  const roomTemplate=await prisma.setTemplate.create({data:{slug:"small-room",name:"Small room essentials",description:"Sleep, light, storage and useful study space",outcomeId:outcomeRows[5]!.id,slots:{create:[{name:"Sleeping",purpose:"Rest safely",required:true,priority:1,categories:["bedroom-furniture"],constraints:{}},{name:"Lighting",purpose:"General and task light",required:true,priority:2,categories:["lighting"],constraints:{}},{name:"Storage",purpose:"Use limited space well",required:true,priority:3,categories:["storage","organization"],constraints:{}},{name:"Power",purpose:"Safe shared-room power",required:true,priority:4,categories:["power"],constraints:{}},{name:"Study",purpose:"Optional study area",required:false,priority:5,categories:["desks","chairs"],constraints:{}}]}}});
  const templateByOutcome=new Map<number,{id:string}>([[0,workTemplate],[5,roomTemplate]]);
  const extraTemplates=[
    {index:1,slug:"home-office",name:"Focused home office",description:"A balanced workstation for sustained focus and video calls.",slots:[["Primary computer",true,["laptops"]],["Display",false,["displays"]],["Input and calls",true,["keyboards","mice","audio"]],["Task lighting",false,["lighting"]]]},
    {index:2,slug:"flexible-gaming",name:"Flexible gaming station",description:"A platform-neutral setup built around products the user already owns.",slots:[["Gaming platform",true,["laptops","gaming"]],["Display",true,["displays"]],["Controls",true,["keyboards","mice","gaming"]],["Audio",false,["audio"]]]},
    {index:3,slug:"comfort",name:"Comfort and ergonomics",description:"Improve comfort around an existing work or play setup.",slots:[["Work surface",false,["desks"]],["Seating",true,["chairs"]],["Viewing position",false,["displays","laptop-stands"]],["Input comfort",false,["keyboards","mice"]],["Lighting",false,["lighting"]]]},
    {index:4,slug:"compact-room",name:"Compact room layout",description:"Use a small room efficiently with adaptable furniture and storage.",slots:[["Anchor furniture",true,["desks","chairs","bedroom-furniture"]],["Storage",true,["storage","organization"]],["Lighting",false,["lighting"]],["Power",false,["power"]]]},
    {index:6,slug:"upgrade-owned",name:"Upgrade what you own",description:"Identify high-value additions while preserving useful owned products.",slots:[["Core device",false,["laptops","gaming"]],["Workspace",false,["desks","chairs"]],["Display or output",false,["displays","audio"]],["Input or control",false,["keyboards","mice","gaming"]],["Support",false,["storage","lighting","power"]]]},
    {index:7,slug:"value-first",name:"Value-first setup",description:"Complete a useful setup while keeping total cost low.",slots:[["Essential anchor",true,["laptops","desks","bedroom-furniture"]],["Essential support",true,["chairs","displays","storage"]],["Low-cost accessory",false,["mice","lighting","organization"]]]},
    {index:8,slug:"cohesive-look",name:"Cohesive look",description:"Create a visually consistent setup around the user’s preferred style.",slots:[["Anchor",true,["desks","chairs","laptops"]],["Visual support",true,["lighting","organization"]],["Organization",false,["storage"]],["Coordinated accessory",false,["keyboards","mice","audio"]]]},
    {index:9,slug:"useful-accessories",name:"Useful accessories",description:"Add practical accessories only where they solve a real gap.",slots:[["Primary product",false,["laptops","gaming","desks"]],["Control or input",false,["keyboards","mice","gaming"]],["Audio",false,["audio"]],["Lighting or organization",false,["lighting","storage","organization"]]]}
  ] as const;
  for(const spec of extraTemplates){
    const template=await prisma.setTemplate.create({data:{slug:spec.slug,name:spec.name,description:spec.description,outcomeId:outcomeRows[spec.index]!.id,slots:{create:spec.slots.map(([name,required,categories],priority)=>({name,purpose:`Complete the ${name.toLowerCase()} need`,required,priority:priority+1,categories:[...categories],constraints:{}}))}}});
    templateByOutcome.set(spec.index,template);
  }

  const rules=[
    ["laptops","Build a study setup","power","Power",1,"ESSENTIAL","A surge-protected power source helps protect the laptop."],
    ["laptops","Build a study setup","laptop-stands","Ergonomics",2,"USEFUL","A stand raises the display; add an external keyboard for neutral wrists."],
    ["laptops","Build a study setup","lighting","Lighting",3,"USEFUL","Focused lighting reduces reliance on harsh room lighting."],
    ["laptops","Create a work-from-home setup","displays","Display",2,"USEFUL","A second display can add working area when desk depth permits."],
    ["laptops","Complete a gaming setup","gaming","Input",2,"USEFUL","Gaming accessories can complete control and cooling needs."],
    ["desks","Organize a small room","organization","Cable management",2,"USEFUL","Small organizers recover usable desk area."],
    ["bedroom-furniture","Prepare a hostel room","power","Power",1,"ESSENTIAL","Choose a safe power strip; never daisy-chain extensions."]
  ] as const;
  for(const [anchorCategory,outcome,complementCategory,slotName,priority,essentiality,explanation] of rules) await prisma.complementRule.create({data:{anchorCategory,outcome,complementCategory,slotName,priority,essentiality,explanation,compatibility:{},exclusions:{},warning:complementCategory==="power"?"Check outlet load and earthing before use.":null}});

  const topics=[]; for(const name of ["Student setups","Gaming","Small rooms","Hostel living","Ergonomics","Budget builds"]) topics.push(await prisma.topic.create({data:{name,slug:name.toLowerCase().replaceAll(" ","-"),description:`Practical ${name.toLowerCase()} with outcome evidence.`}}));
  const setNames=["Student desk under ₹30,000","Small-room workstation","Budget gaming desk","Hostel-room essentials","Mixed-brand notebook workspace","Official-brand laptop ecosystem","Rental-bedroom setup","Quiet exam corner","Compact creator desk","Back-friendly WFH setup","No-drill rental organization","First-year hostel kit","144Hz value station","Foldaway work corner","Warm minimalist study desk"];
  const sets=[];
  for(let i=0;i<setNames.length;i++){
    const owner=users[i%4]!; const anchor=products[i%5]!; const chosen=[anchor,products[15+(i%5)]!,products[25+(i%5)]!,products[40+(i%5)]!];
    const total=chosen.reduce((n,p)=>n+p.price,0); const type=i%3===0?SetType.COMMUNITY:i%3===1?SetType.MIXED:SetType.OFFICIAL;
    const setOutcome=outcomes[i%outcomes.length]!; const selectedTemplate=templateByOutcome.get(i%outcomes.length) ?? workTemplate;\n    const set=await prisma.productSet.create({data:{ownerId:owner.id,title:setNames[i]!,slug:`${setNames[i]!.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${i+1}`,description:"A practical, evidence-led demo set. Prices are seeded and compatibility claims are limited to explicit local evidence.",anchorProductId:anchor.id,outcome:setOutcome,budget:Math.max(15000,Math.ceil(total/1000)*1000),constraints:{widthCm:80+(i%4)*20,space:i%2?"small":"standard"},setType:type,visibility:i===13?Visibility.UNLISTED:Visibility.PUBLIC,status:"ACTIVE",totalPrice:total,slotScore:75+(i%5)*5,compatibilityScore:78+(i%4)*5,valueScore:70+(i%6)*5,communityRating:3.8+(i%6)*0.2,outcomeSuccess:72+(i%5)*6,usageDays:30+(i%7)*30,templateId:selectedTemplate.id,slots:{create:slotMap.slice(0,7).map(([name,purpose,required],j)=>({name,purpose,required,priority:j+1,status:j<4?"COMPLETE":"MISSING"}))},items:{create:chosen.map((p,j)=>({productId:p.id,slotName:["Computer","Ergonomics","Power","Lighting"][j]!,owned:j<2,selectedPrice:p.price,usageDays:30+(i%7)*30,addedById:owner.id,attribution:"Original set creator"}))}}}); sets.push(set);
    await prisma.setUpdate.create({data:{setId:set.id,authorId:owner.id,kind:i%2?"STILL_USING":"STARTED_USING",note:i%2?"Still reliable; no unnecessary purchases so far.":"Started using this setup and will report at 90 days.",usageDays:30+(i%7)*30}});
    await prisma.feedEvent.create({data:{actorId:owner.id,setId:set.id,type:"SET_PUBLISHED",title:`${owner.username} published ${set.title}`,detail:"A new outcome-focused set is available."}});
  }
  for(let i=0;i<10;i++) await prisma.productWorld.create({data:{slug:`${products[i]!.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-world`,title:`${products[i]!.name} Product World`,productId:products[i]!.id,description:"Official, mixed-brand and community-proven combinations around this anchor.",followers:12+i*7}});
  for(let i=0;i<10;i++) await prisma.compatibilityEdge.create({data:{fromId:products[i]!.id,toId:products[20+(i%5)]!.id,status:i%4===3?"LIKELY":"CONFIRMED",evidence:i%4===3?"Matching category requirements; exact ports should be confirmed.":"Seeded manufacturer specification match.",conditions:{demoEvidence:true}}});
  for(let i=0;i<8;i++) await prisma.setRating.create({data:{setId:sets[i]!.id,userId:users[(i+1)%4]!.id,outcome:4+(i%2),value:4,compatibility:4,usefulness:5,comfort:4,appearance:4,durability:4,usageDays:30+(i%4)*30,ownsSet:i%2===0,explanation:"I used or recreated the core combination and it achieved the stated outcome within the demo budget."}});
  for(let i=0;i<6;i++) await prisma.productSuggestion.create({data:{setId:sets[i]!.id,authorId:users[(i+1)%4]!.id,type:i%2?"USE_CHEAPER":"ADD_PRODUCT",productId:products[45+(i%5)]!.id,reason:"This could improve task lighting without duplicating an existing slot.",status:i<2?"ACCEPTED":"OPEN"}});
  for(let i=0;i<8;i++) await prisma.comment.create({data:{setId:sets[i%sets.length]!.id,authorId:users[(i+2)%4]!.id,body:"The slot-by-slot explanation made the trade-offs easy to understand."}});
  for(let i=0;i<4;i++) await prisma.userFollow.create({data:{followerId:users[i]!.id,followingId:users[(i+1)%4]!.id}});
  for(let i=0;i<8;i++) await prisma.productSetFollow.create({data:{userId:users[(i+1)%4]!.id,setId:sets[i]!.id}});
  await addGenericData(prisma);
  console.log(`Seeded the original demo plus generic goals, diverse categories and cross-category sets.`);
}
main().finally(()=>prisma.$disconnect());
