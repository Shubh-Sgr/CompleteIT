import nodemailer from "nodemailer";
import {env} from "../config/env.js";
const transport=nodemailer.createTransport({host:env.MAIL_HOST,port:env.MAIL_PORT,secure:env.MAIL_SECURE==="true",auth:env.MAIL_USER&&env.MAIL_PASSWORD?{user:env.MAIL_USER,pass:env.MAIL_PASSWORD}:undefined,disableFileAccess:true,disableUrlAccess:true});
export async function sendLocalMail(to:string,subject:string,text:string){return transport.sendMail({from:env.MAIL_FROM,to,subject,text});}
