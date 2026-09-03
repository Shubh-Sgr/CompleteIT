import type {RequestHandler} from "express";
import type {ZodType} from "zod";
export const validate=(schema:ZodType,source:"body"|"query"|"params"="body"):RequestHandler=>(req,_res,next)=>{const result=schema.safeParse(req[source]);if(!result.success)return next(Object.assign(new Error("Validation failed"),{status:400,code:"VALIDATION_ERROR",details:result.error.flatten()}));req[source]=result.data;next();};
