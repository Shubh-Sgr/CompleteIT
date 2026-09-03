import {SignJWT,jwtVerify} from "jose";
import {createHash,randomUUID} from "node:crypto";
import {env} from "../config/env.js";
const enc=new TextEncoder();
export async function signAccess(user:{id:string,email:string}){return new SignJWT({email:user.email}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("15m").sign(enc.encode(env.JWT_ACCESS_SECRET));}
export async function signRefresh(user:{id:string,email:string}){return new SignJWT({email:user.email,jti:randomUUID()}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(enc.encode(env.JWT_REFRESH_SECRET));}
export async function verifyAccess(token:string){const {payload}=await jwtVerify(token,enc.encode(env.JWT_ACCESS_SECRET));return {userId:String(payload.sub),email:String(payload.email)};}
export async function verifyRefresh(token:string){const {payload}=await jwtVerify(token,enc.encode(env.JWT_REFRESH_SECRET));return {userId:String(payload.sub),email:String(payload.email)};}
export const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");
export async function signEmailToken(user:{id:string,email:string},purpose:"verify"|"reset"){return new SignJWT({email:user.email,purpose}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime(purpose==="verify"?"24h":"30m").sign(enc.encode(env.EMAIL_TOKEN_SECRET));}
export async function verifyEmailToken(token:string,purpose:"verify"|"reset"){const {payload}=await jwtVerify(token,enc.encode(env.EMAIL_TOKEN_SECRET));if(payload.purpose!==purpose)throw new Error("Wrong token purpose");return {userId:String(payload.sub),email:String(payload.email)};}
