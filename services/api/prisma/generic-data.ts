import type {PrismaClient} from "@prisma/client";

export const genericCatalogue:Record<string,Array<[string,string,number]>>={
  cooking:[["Chef Knife","Everyday Kitchen",1499],["Bamboo Cutting Board","Everyday Kitchen",799],["Stainless Saucepan","CookWell",1899]],
  fitness:[["Yoga Mat","MoveWell",999],["Resistance Band Set","MoveWell",749],["Adjustable Dumbbells","StrongStart",3499]],
  cycling:[["Cycle Helmet","RoadReady",1799],["Puncture Repair Kit","RoadReady",499],["Insulated Bottle","TrailMate",699]],
  travel:[["Packing Cube Set","Roam",899],["Universal Travel Adapter","Roam",1299],["Compact Toiletry Bag","TrailMate",649]],
  photography:[["Travel Tripod","FrameLab",2199],["Padded Camera Bag","FrameLab",1899],["Memory Card 128GB","StoreFast",999]],
  gardening:[["Hand Trowel","GreenPatch",399],["Pruning Shears","GreenPatch",649],["Watering Can","PlantPal",549]],
  "pet-care":[["Everyday Pet Bowl","PawHome",449],["Adjustable Leash","PawHome",799],["Grooming Brush","KindPet",599]],
  "arts-and-crafts":[["Self-healing Cutting Mat","MakeRoom",899],["Precision Craft Tool Set","MakeRoom",749],["Portable Supply Caddy","TidyLab",699]],
  music:[["Foldable Guitar Stand","SoundRoom",899],["Clip-on Instrument Tuner","SoundRoom",499],["Digital Metronome","Tempo",699]],
  camping:[["Compact First-aid Kit","TrailSafe",999],["Portable Camp Stove","TrailMate",2499],["Water Filter Bottle","TrailSafe",1799]],
  "car-care":[["Portable Tyre Inflator","RoadReady",2299],["Microfiber Cleaning Kit","AutoKind",799],["Roadside Emergency Kit","TrailSafe",1999]],
  "food-and-grocery":[["Protein Oats Chocolate","Pintola",899],["Roasted Chana","Jabsons",249],["Crunchy Peanut Snack","Haldirams",199],["Roasted Almonds","PantryWorks",499],["Roasted Cashews","PantryWorks",549],["Millets and Chana Mix","DailyGrain",349],["Almond Brittle","GoodBite",299],["Beaten Chana","GoodBite",249],["Diet Chivda","GoodBite",229],["Cardamom Tea","DailyGrain",199]],
  "party-supplies":[["Reusable Tableware Set","Gather",1199],["Paper Decoration Kit","Gather",599],["Serving Bowl Set","Everyday Home",999]],
  "personal-care":[["Travel Grooming Kit","DailyCare",1299],["Refillable Toiletry Bottles","DailyCare",449],["Compact Medicine Organizer","DailyCare",349]]
};

const universalGoals=[
  "Complete what I already have","Add useful extras","Start something from scratch","Replace or upgrade items",
  "Organize and store items","Protect or maintain items","Make it portable","Spend less"
];

const examples=[
  ["Weekend bicycle essentials","Be ready for safe weekend rides","cycling",["GEN-CYCLING-1","GEN-CYCLING-2","GEN-CYCLING-3"]],
  ["Balcony gardening starter set","Grow and maintain balcony herbs","gardening",["GEN-GARDENING-1","GEN-GARDENING-2","GEN-GARDENING-3"]],
  ["Two-day camping checklist","Prepare for a short camping trip","camping",["GEN-CAMPING-1","GEN-CAMPING-2","GEN-CAMPING-3"]],
  ["Everyday cooking basics","Cook simple daily meals","cooking",["GEN-COOKING-1","GEN-COOKING-2","GEN-COOKING-3"]],
  ["Beginner home fitness kit","Exercise at home with minimal equipment","fitness",["GEN-FITNESS-1","GEN-FITNESS-2","GEN-FITNESS-3"]],
  ["Carry-on travel organizer","Pack efficiently for a short trip","travel",["GEN-TRAVEL-1","GEN-TRAVEL-2","GEN-TRAVEL-3"]],
  ["Starter photography carry kit","Take a camera safely on day trips","photography",["GEN-PHOTOGRAPHY-1","GEN-PHOTOGRAPHY-2","GEN-PHOTOGRAPHY-3"]],
  ["Portable craft toolbox","Keep everyday craft tools together","arts-and-crafts",["GEN-ARTS-AND-CRAFTS-1","GEN-ARTS-AND-CRAFTS-2","GEN-ARTS-AND-CRAFTS-3"]],
  ["New pet welcome kit","Cover everyday feeding, walking and grooming","pet-care",["GEN-PET-CARE-1","GEN-PET-CARE-2","GEN-PET-CARE-3"]],
  ["Basic roadside readiness","Handle common car problems safely","car-care",["GEN-CAR-CARE-1","GEN-CAR-CARE-2","GEN-CAR-CARE-3"]]
] as const;

const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const prefix=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]+/g,"-");

export async function addGenericData(prisma:PrismaClient){
  for(const [categorySlug,rows] of Object.entries(genericCatalogue)){
    const name=categorySlug.split("-").map(part=>part[0]!.toUpperCase()+part.slice(1)).join(" ");
    const category=await prisma.productCategory.upsert({where:{slug:categorySlug},update:{name},create:{slug:categorySlug,name}});
    for(const [index,[productName,brand,price]] of rows.entries())await prisma.product.upsert({where:{sku:`GEN-${prefix(categorySlug)}-${index+1}`},update:{name:productName,brand,price,categoryId:category.id},create:{sku:`GEN-${prefix(categorySlug)}-${index+1}`,name:productName,brand,price,categoryId:category.id,description:`Demo ${productName} showing that CompleteIt supports ${name.toLowerCase()} and other non-technology categories.`,rating:4+(index*.2),ratingCount:8+index*3,metadata:{demoMerchant:"CompleteIt Demo Store",genericExample:true}}});
  }

  for(const [index,name] of universalGoals.entries()){
    const outcome=await prisma.outcome.upsert({where:{slug:`universal-${slug(name)}`},update:{name,description:"A category-neutral starting action. The user can always replace it with free text."},create:{slug:`universal-${slug(name)}`,name,description:"A category-neutral starting action. The user can always replace it with free text."}});
    await prisma.setTemplate.upsert({where:{slug:`universal-action-${index+1}`},update:{name:`Flexible: ${name}`,description:"Builds its needs dynamically from owned, planned and described items instead of using fixed product categories.",outcomeId:outcome.id},create:{slug:`universal-action-${index+1}`,name:`Flexible: ${name}`,description:"Builds its needs dynamically from owned, planned and described items instead of using fixed product categories.",outcomeId:outcome.id}});
  }

  for(const name of ["Cooking","Fitness","Cycling","Travel","Photography","Gardening","Pet care","Arts and crafts","Music","Camping","Car care","Food and pantry"]){const topicSlug=`general-${slug(name)}`;await prisma.topic.upsert({where:{slug:topicSlug},update:{name,description:`Community sets and long-term notes about ${name.toLowerCase()}.`},create:{slug:topicSlug,name,description:`Community sets and long-term notes about ${name.toLowerCase()}.`}})}

  const users=await prisma.user.findMany({where:{username:{in:["aisha","rohan","meera","kabir"]}},orderBy:{username:"asc"}});
  for(const [index,[title,outcome,categorySlug,skus]] of examples.entries()){
    const owner=users[index%users.length];if(!owner)continue;
    const products=await prisma.product.findMany({where:{sku:{in:[...skus]}},include:{category:true},orderBy:{sku:"asc"}});if(!products.length)continue;
    const setSlug=`generic-${slug(title)}`;const total=products.reduce((sum,product)=>sum+product.price,0);
    await prisma.productSet.upsert({where:{slug:setSlug},update:{title,outcome,description:`A diverse demo set for ${categorySlug.replaceAll("-"," ")}. It uses the same generic set model as every other category.`,slotScore:96,compatibilityScore:82,valueScore:88,outcomeSuccess:86,usageDays:180},create:{ownerId:owner.id,title,slug:setSlug,description:`A diverse demo set for ${categorySlug.replaceAll("-"," ")}. It uses the same generic set model as every other category.`,outcome,budget:Math.ceil(total/500)*500,setType:"COMMUNITY",visibility:"PUBLIC",status:"ACTIVE",totalPrice:total,slotScore:96,compatibilityScore:82,valueScore:88,communityRating:4.4,outcomeSuccess:86,usageDays:180,anchorProductId:products[0]!.id,slots:{create:products.map((product,slotIndex)=>({name:product.name,purpose:`Contributes to: ${outcome}`,required:slotIndex<2,priority:slotIndex+1,status:"COMPLETE"}))},items:{create:products.map((product,slotIndex)=>({productId:product.id,slotName:product.name,owned:slotIndex===0,selectedPrice:product.price,usageDays:180,addedById:owner.id,attribution:"Generic demo set creator"}))}}});
    const anchor=products[0]!;await prisma.productWorld.upsert({where:{slug:`generic-${slug(anchor.name)}-world`},update:{title:`${anchor.name} combinations`,description:`Cross-brand and community ideas around ${anchor.name}.`,productId:anchor.id},create:{slug:`generic-${slug(anchor.name)}-world`,title:`${anchor.name} combinations`,description:`Cross-brand and community ideas around ${anchor.name}.`,productId:anchor.id}});for(const user of users.slice(0,index%users.length+1))await prisma.productFollow.upsert({where:{userId_productId:{userId:user.id,productId:anchor.id}},update:{},create:{userId:user.id,productId:anchor.id}});
  }
  await Promise.all(users.map(user=>prisma.userProfile.update({where:{userId:user.id},data:{bio:"Practical collections across hobbies, travel, food, home, work and everyday life—with transparent trade-offs."}})));
}
