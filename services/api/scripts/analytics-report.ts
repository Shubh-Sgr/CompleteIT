import {prisma} from "../src/config/prisma.js";

const days=Math.max(1,Number(process.argv[2]??30)||30);
const since=new Date(Date.now()-days*86_400_000);
const events=await prisma.feedEvent.findMany({where:{type:{startsWith:"ANALYTICS_"},createdAt:{gte:since}},select:{type:true,metadata:true,createdAt:true}});
const eventOrder=["LANDING_VIEW","CREATE_STARTED","INPUT_SUBMITTED","AI_RESULT","RECOMMENDATION_SELECTED","SET_SAVED","SHARE_CLICKED","ITEM_PROGRESS_CHANGED","SEARCH_SUBMITTED"];
const rows=eventOrder.map(name=>{
  const matching=events.filter(event=>event.type===`ANALYTICS_${name}`);
  const visitors=new Set(matching.map(event=>String((event.metadata as Record<string,unknown>)?.anonymousId??"unknown")));
  return {event:name.toLowerCase(),events:matching.length,visitors:visitors.size};
});
const uniqueVisitors=new Set(events.map(event=>String((event.metadata as Record<string,unknown>)?.anonymousId??"unknown"))).size;
const visitorsFor=(name:string)=>rows.find(row=>row.event===name)?.visitors??0;
const percent=(value:number,total:number)=>total?`${Math.round(value/total*100)}%`:"—";

console.log(`CompleteIt product funnel · last ${days} days`);
console.table(rows);
console.table({
  "visitor → create":percent(visitorsFor("create_started"),visitorsFor("landing_view")),
  "create → AI result":percent(visitorsFor("ai_result"),visitorsFor("create_started")),
  "AI result → saved":percent(visitorsFor("set_saved"),visitorsFor("ai_result")),
  "saved → shared":percent(visitorsFor("share_clicked"),visitorsFor("set_saved"))
});
console.log(`${uniqueVisitors} anonymous visitors produced ${events.length} events.`);
await prisma.$disconnect();
