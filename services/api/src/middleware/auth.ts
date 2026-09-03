import type {RequestHandler} from "express";
import {verifyAccess} from "../utils/tokens.js";
import {AppError} from "../errors/AppError.js";
export const optionalAuth:RequestHandler=async(req,_res,next)=>{try{const token=req.cookies?.accessToken as string|undefined;if(token)req.auth=await verifyAccess(token);}catch{}next();};
export const requireAuth:RequestHandler=async(req,_res,next)=>{try{const token=req.cookies?.accessToken as string|undefined;if(!token)throw new AppError(401,"Authentication required","AUTH_REQUIRED");req.auth=await verifyAccess(token);next();}catch(error){next(error instanceof AppError?error:new AppError(401,"Session expired","SESSION_EXPIRED"));}};
