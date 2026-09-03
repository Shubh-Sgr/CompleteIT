import type {ErrorRequestHandler} from "express";
import {AppError} from "../errors/AppError.js";
export const notFound=(req:any,_res:any,next:any)=>next(new AppError(404,`Route ${req.method} ${req.path} not found`,"NOT_FOUND"));
export const errorHandler:ErrorRequestHandler=(error,req,res,_next)=>{const status=Number(error.status??500);if(status>=500)req.log?.error({err:error},"request failed");res.status(status).json({error:{code:error.code??"INTERNAL_ERROR",message:status>=500?"Unexpected server error":error.message,details:error.details,requestId:req.id}});};
