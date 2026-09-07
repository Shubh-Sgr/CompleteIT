import type {RequestHandler} from "express";
import {prisma} from "../config/prisma.js";

export const recordEvent:RequestHandler=async(req,res)=>{
  const {event,anonymousId,path,properties}=req.body;
  await prisma.feedEvent.create({data:{
    actorId:req.auth?.userId,
    type:`ANALYTICS_${String(event).toUpperCase()}`,
    title:event,
    detail:path,
    metadata:{anonymousId,...properties}
  }});
  res.status(202).json({accepted:true});
};
