import type {RequestHandler} from "express";
import {prisma} from "../config/prisma.js";

const compactSetSelect={id:true,slug:true,title:true,description:true,outcome:true,budget:true,totalPrice:true,slotScore:true,communityRating:true,setType:true,visibility:true,status:true,usageDays:true,updatedAt:true,owner:{select:{username:true,profile:{select:{displayName:true,avatarUrl:true}}}},items:{select:{product:{select:{category:{select:{name:true}}}}}},_count:{select:{followers:true,forks:true}}} as const;

export const explore:RequestHandler=async(_req,res)=>{
  const sets=await prisma.productSet.findMany({where:{visibility:"PUBLIC",status:{in:["ACTIVE","COMPLETED"]}},select:{...compactSetSelect,valueScore:true},orderBy:[{slotScore:"desc"},{compatibilityScore:"desc"},{updatedAt:"desc"}],take:48});
  const used=new Set<string>(),sectionSize=sets.length<10?2:4,sections:Array<{key:string;title:string;setIds:string[]}>=[];
  const addSection=(key:string,title:string,candidates:typeof sets)=>{const setIds=candidates.filter(set=>!used.has(set.id)).slice(0,sectionSize).map(set=>set.id);if(setIds.length){setIds.forEach(id=>used.add(id));sections.push({key,title,setIds})}};
  addSection("highest-fit","Most complete across all categories",[...sets].sort((a,b)=>b.slotScore-a.slotScore));
  addSection("best-value","Best value",[...sets].sort((a,b)=>b.valueScore-a.valueScore));
  const categories=[...new Set(sets.flatMap(set=>set.items.map(item=>item.product.category.name)))];
  for(const category of categories.slice(0,4))addSection(`category-${category}`,category,sets.filter(set=>set.items.some(item=>item.product.category.name===category)));
  addSection("recent","Recently published",[...sets].sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()));
  addSection("most-copied","Most copied",[...sets].sort((a,b)=>b._count.forks-a._count.forks));
  addSection("six-months","Still useful after six months",sets.filter(set=>set.usageDays>=180));
  res.set("Cache-Control","public, max-age=30, stale-while-revalidate=300");
  res.json({sections,sets});
};

export const search:RequestHandler=async(req,res)=>{
  const q=String(req.query.q??"").trim();const budgetMatch=q.match(/(?:under|below|₹)\s*₹?\s*([\d,]+)/i);const parsedBudget=budgetMatch?Number(budgetMatch[1]!.replaceAll(",","")):undefined;
  const numberParam=(name:string)=>{const value=Number(req.query[name]);return Number.isFinite(value)&&value>0?value:undefined};
  const budget=numberParam("budget")??parsedBudget,minSlots=numberParam("minSlots"),minRating=numberParam("minRating"),minOutcome=numberParam("minOutcome"),minUsage=numberParam("minUsage");const setType=["OFFICIAL","MIXED","COMMUNITY","MANUAL","FORK"].includes(String(req.query.setType))?String(req.query.setType):undefined;const terms=q.replace(/under|below|₹|[\d,]+/gi," ").trim();
  if(!terms&&!budget&&!minSlots&&!minRating&&!minOutcome&&!minUsage&&!setType)return res.json({query:{terms,budget,filters:{minSlots,minRating,minOutcome,minUsage,setType}},sets:[],products:[],users:[],topics:[]});
  const [sets,products,users,topics]=await Promise.all([
    prisma.productSet.findMany({where:{visibility:"PUBLIC",status:{in:["ACTIVE","COMPLETED"]},budget:budget?{lte:budget}:undefined,slotScore:minSlots?{gte:minSlots}:undefined,communityRating:minRating?{gte:minRating}:undefined,outcomeSuccess:minOutcome?{gte:minOutcome}:undefined,usageDays:minUsage?{gte:minUsage}:undefined,setType:setType as any,OR:terms?[{title:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}},{outcome:{contains:terms,mode:"insensitive"}},{items:{some:{product:{OR:[{name:{contains:terms,mode:"insensitive"}},{brand:{contains:terms,mode:"insensitive"}},{category:{name:{contains:terms,mode:"insensitive"}}}]}}}}]:undefined},select:compactSetSelect,orderBy:[{slotScore:"desc"},{communityRating:"desc"}],take:24}),
    prisma.product.findMany({where:terms?{OR:[{name:{contains:terms,mode:"insensitive"}},{brand:{contains:terms,mode:"insensitive"}},{category:{name:{contains:terms,mode:"insensitive"}}}]}:{},select:{id:true,name:true,brand:true,price:true,category:{select:{name:true,slug:true}}},orderBy:[{category:{name:"asc"}},{name:"asc"}],take:20}),
    prisma.user.findMany({where:terms?{OR:[{username:{contains:terms,mode:"insensitive"}},{profile:{displayName:{contains:terms,mode:"insensitive"}}}]}:undefined,select:{username:true,profile:{select:{displayName:true,avatarUrl:true}},_count:{select:{followers:true,sets:{where:{visibility:"PUBLIC"}}}}},take:8}),
    prisma.topic.findMany({where:terms?{OR:[{name:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}}]}:undefined,include:{_count:{select:{follows:true}}},orderBy:{name:"asc"},take:12})
  ]);
  res.json({query:{terms,budget,filters:{minSlots,minRating,minOutcome,minUsage,setType}},sets,products,users,topics});
};

export const feed:RequestHandler=async(req,res)=>{const following=await prisma.userFollow.findMany({where:{followerId:req.auth!.userId},select:{followingId:true}});const setFollows=await prisma.productSetFollow.findMany({where:{userId:req.auth!.userId},select:{setId:true}});const events=await prisma.feedEvent.findMany({where:{type:{not:{startsWith:"ANALYTICS_"}},OR:[{actorId:{in:following.map(follow=>follow.followingId)}},{setId:{in:setFollows.map(follow=>follow.setId)}}]},include:{set:{select:{slug:true,title:true}}},orderBy:{createdAt:"desc"},take:50});res.json({events});};
