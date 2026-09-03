import {PrismaClient} from "@prisma/client";

const prisma=new PrismaClient();
const specs=[
  {outcome:"Create a work-from-home setup",slug:"home-office",name:"Focused home office",description:"A balanced workstation for sustained focus and video calls.",slots:[["Primary computer",true,["laptops"]],["Display",false,["displays"]],["Input and calls",true,["keyboards","mice","audio"]],["Task lighting",false,["lighting"]]]},
  {outcome:"Complete a gaming setup",slug:"flexible-gaming",name:"Flexible gaming station",description:"A platform-neutral setup built around products the user already owns.",slots:[["Gaming platform",true,["laptops","gaming"]],["Display",true,["displays"]],["Controls",true,["keyboards","mice","gaming"]],["Audio",false,["audio"]]]},
  {outcome:"Improve ergonomics",slug:"comfort",name:"Comfort and ergonomics",description:"Improve comfort around an existing work or play setup.",slots:[["Work surface",false,["desks"]],["Seating",true,["chairs"]],["Viewing position",false,["displays","laptop-stands"]],["Input comfort",false,["keyboards","mice"]],["Lighting",false,["lighting"]]]},
  {outcome:"Organize a small room",slug:"compact-room",name:"Compact room layout",description:"Use a small room efficiently with adaptable furniture and storage.",slots:[["Anchor furniture",true,["desks","chairs","bedroom-furniture"]],["Storage",true,["storage","organization"]],["Lighting",false,["lighting"]],["Power",false,["power"]]]},
  {outcome:"Upgrade an existing setup",slug:"upgrade-owned",name:"Upgrade what you own",description:"Identify high-value additions while preserving useful owned products.",slots:[["Core device",false,["laptops","gaming"]],["Workspace",false,["desks","chairs"]],["Display or output",false,["displays","audio"]],["Input or control",false,["keyboards","mice","gaming"]],["Support",false,["storage","lighting","power"]]]},
  {outcome:"Reduce total cost",slug:"value-first",name:"Value-first setup",description:"Complete a useful setup while keeping total cost low.",slots:[["Essential anchor",true,["laptops","desks","bedroom-furniture"]],["Essential support",true,["chairs","displays","storage"]],["Low-cost accessory",false,["mice","lighting","organization"]]]},
  {outcome:"Improve appearance",slug:"cohesive-look",name:"Cohesive look",description:"Create a visually consistent setup around the user’s preferred style.",slots:[["Anchor",true,["desks","chairs","laptops"]],["Visual support",true,["lighting","organization"]],["Organization",false,["storage"]],["Coordinated accessory",false,["keyboards","mice","audio"]]]},
  {outcome:"Find compatible accessories",slug:"useful-accessories",name:"Useful accessories",description:"Add practical accessories only where they solve a real gap.",slots:[["Primary product",false,["laptops","gaming","desks"]],["Control or input",false,["keyboards","mice","gaming"]],["Audio",false,["audio"]],["Lighting or organization",false,["lighting","storage","organization"]]]}
];

for(const spec of specs){
  const outcome=await prisma.outcome.findFirst({where:{name:spec.outcome}});
  if(!outcome)continue;
  const exists=await prisma.setTemplate.findUnique({where:{slug:spec.slug}});
  if(exists)continue;
  await prisma.setTemplate.create({data:{slug:spec.slug,name:spec.name,description:spec.description,outcomeId:outcome.id,slots:{create:spec.slots.map(([name,required,categories],priority)=>({name,purpose:`Complete the ${name.toLowerCase()} need`,required,priority:priority+1,categories,constraints:{}}))}}});
}

const total=await prisma.setTemplate.count();
console.log(`Template backfill complete; ${total} templates available.`);
await prisma.$disconnect();
