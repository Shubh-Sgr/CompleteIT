import type {RequestHandler} from "express";
import {prisma} from "../config/prisma.js";

export const explore:RequestHandler=async(_req,res)=>{
  const sets=await prisma.productSet.findMany({where:{visibility:"PUBLIC",status:{in:["ACTIVE","COMPLETED"]}},include:{owner:{select:{username:true,profile:true}},items:{include:{product:{include:{category:true}}}},_count:{select:{followers:true,forks:true}}},orderBy:[{slotScore:"desc"},{compatibilityScore:"desc"},{updatedAt:"desc"}]});
  const categories=[...new Set(sets.flatMap(set=>set.items.map(item=>item.product.category?.name).filter(Boolean)))];
  const categorySections=categories.map(category=>({key:`category-${category}`,title:category,sets:sets.filter(set=>set.items.some(item=>item.product.category?.name===category)).slice(0,6)})).filter(section=>section.sets.length>=1).slice(0,6);
  res.json({sections:[{key:"highest-fit",title:"Most complete across all categories",sets:[...sets].sort((a,b)=>b.slotScore-a.slotScore).slice(0,6)},{key:"best-value",title:"Best value",sets:[...sets].sort((a,b)=>b.valueScore-a.valueScore).slice(0,6)},...categorySections,{key:"most-copied",title:"Most copied",sets:[...sets].sort((a,b)=>b._count.forks-a._count.forks).slice(0,6)},{key:"recent",title:"Recently published",sets:[...sets].sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()).slice(0,6)},{key:"six-months",title:"Still used after six months",sets:sets.filter(set=>set.usageDays>=180).slice(0,6)}],sets});
};

export const search:RequestHandler=async(req,res)=>{
  const q=String(req.query.q??"").trim();const budgetMatch=q.match(/(?:under|below|₹)\s*₹?\s*([\d,]+)/i);const parsedBudget=budgetMatch?Number(budgetMatch[1]!.replaceAll(",","")):undefined;
  const numberParam=(name:string)=>{const value=Number(req.query[name]);return Number.isFinite(value)&&value>0?value:undefined};
  const budget=numberParam("budget")??parsedBudget,minSlots=numberParam("minSlots"),minRating=numberParam("minRating"),minOutcome=numberParam("minOutcome"),minUsage=numberParam("minUsage");const setType=["OFFICIAL","MIXED","COMMUNITY","MANUAL","FORK"].includes(String(req.query.setType))?String(req.query.setType):undefined;const terms=q.replace(/under|below|₹|[\d,]+/gi," ").trim();
  const [sets,products,users,topics]=await Promise.all([
    prisma.productSet.findMany({where:{visibility:"PUBLIC",status:{in:["ACTIVE","COMPLETED"]},budget:budget?{lte:budget}:undefined,slotScore:minSlots?{gte:minSlots}:undefined,communityRating:minRating?{gte:minRating}:undefined,outcomeSuccess:minOutcome?{gte:minOutcome}:undefined,usageDays:minUsage?{gte:minUsage}:undefined,setType:setType as any,OR:terms?[{title:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}},{outcome:{contains:terms,mode:"insensitive"}},{items:{some:{product:{OR:[{name:{contains:terms,mode:"insensitive"}},{brand:{contains:terms,mode:"insensitive"}},{category:{name:{contains:terms,mode:"insensitive"}}}]}}}}]:undefined},include:{owner:{select:{username:true,profile:true}},items:{include:{product:true}}},orderBy:[{slotScore:"desc"},{communityRating:"desc"}],take:60}),
    prisma.product.findMany({where:terms?{OR:[{name:{contains:terms,mode:"insensitive"}},{brand:{contains:terms,mode:"insensitive"}},{category:{name:{contains:terms,mode:"insensitive"}}}]}:{},include:{category:true},orderBy:[{category:{name:"asc"}},{name:"asc"}],take:40}),
    prisma.user.findMany({where:terms?{OR:[{username:{contains:terms,mode:"insensitive"}},{profile:{displayName:{contains:terms,mode:"insensitive"}}}]}:undefined,select:{username:true,profile:true,_count:{select:{followers:true,sets:{where:{visibility:"PUBLIC"}}}}},take:12}),
    prisma.topic.findMany({where:terms?{OR:[{name:{contains:terms,mode:"insensitive"}},{description:{contains:terms,mode:"insensitive"}}]}:undefined,include:{_count:{select:{follows:true}}},orderBy:{name:"asc"},take:20})
  ]);
  res.json({query:{terms,budget,filters:{minSlots,minRating,minOutcome,minUsage,setType}},sets,products,users,topics});
};

export const feed:RequestHandler=async(req,res)=>{const following=await prisma.userFollow.findMany({where:{followerId:req.auth!.userId},select:{followingId:true}});const setFollows=await prisma.productSetFollow.findMany({where:{userId:req.auth!.userId},select:{setId:true}});const events=await prisma.feedEvent.findMany({where:{OR:[{actorId:{in:following.map(follow=>follow.followingId)}},{setId:{in:setFollows.map(follow=>follow.setId)}}]},include:{set:{select:{slug:true,title:true}}},orderBy:{createdAt:"desc"},take:50});res.json({events});};
