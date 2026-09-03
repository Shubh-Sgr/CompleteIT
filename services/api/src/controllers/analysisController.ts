import type {RequestHandler} from "express";
import {GetObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import {randomUUID} from "node:crypto";
import {env} from "../config/env.js";
import {prisma} from "../config/prisma.js";
import {AppError} from "../errors/AppError.js";
import {recommend} from "../services/recommendationService.js";
import {analyzeImageLocally} from "../services/localOcrService.js";
import {analyzeImageWithVision,visionIsConfigured} from "../services/multimodalVisionService.js";

const storageHost=/^https?:\/\//i.test(env.MINIO_ENDPOINT)?env.MINIO_ENDPOINT:`${env.MINIO_USE_SSL==="true"?"https":"http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;
const minio=new S3Client({endpoint:storageHost,region:env.MINIO_REGION,forcePathStyle:env.MINIO_FORCE_PATH_STYLE==="true",credentials:{accessKeyId:env.MINIO_ACCESS_KEY,secretAccessKey:env.MINIO_SECRET_KEY}});
const textTokens=(value:string)=>new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>word.length>2)??[]);
function editDistance(left:string,right:string){const row=Array.from({length:right.length+1},(_,index)=>index);for(let i=1;i<=left.length;i++){let diagonal=row[0]!;row[0]=i;for(let j=1;j<=right.length;j++){const previous=row[j]!;row[j]=Math.min(row[j]!+1,row[j-1]!+1,diagonal+(left[i-1]===right[j-1]?0:1));diagonal=previous}}return row[right.length]!}
function tokensMatch(left:string,right:string){if(left===right)return true;if(Math.min(left.length,right.length)<3)return false;if(Math.abs(left.length-right.length)<=1&&editDistance(left,right)<=1)return true;return Math.abs(left.length-right.length)<=2&&(left.includes(right)||right.includes(left))}

async function classifyOcrObjects(objects:any[]){
  const categories=await prisma.productCategory.findMany({include:{products:{where:{custom:false},select:{name:true,brand:true}}}});
  return objects.map(object=>{
    const objectTokens=textTokens(object.label);
    const ranked=categories.map(category=>{
      const categoryTokens=textTokens(`${category.slug} ${category.name}`);
      let score=[...categoryTokens].filter(token=>objectTokens.has(token)).length*5;
      const products=category.products.map(product=>{const nameTokens=[...textTokens(product.name)];const nameMatches=nameTokens.filter(token=>[...objectTokens].some(objectToken=>tokensMatch(token,objectToken))).length;const brandMatches=[...textTokens(product.brand)].filter(token=>[...objectTokens].some(objectToken=>tokensMatch(token,objectToken))).length;return {name:product.name,score:nameMatches,total:nameMatches+brandMatches}}).sort((a,b)=>b.total-a.total||b.score-a.score);
      score+=Math.min(4,products[0]?.total??0);
      return {slug:category.slug,score,product:products[0]};
    }).sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    return {...object,label:best?.product&&best.product.score>=2?best.product.name:object.label,category:best&&best.score>0?best.slug:"uncategorized",attributes:{...object.attributes,ocrLabel:object.label}};
  });
}

export const uploadImage:RequestHandler=async(req,res)=>{
  if(!req.file)throw new AppError(400,"An image file is required");
  if(req.file.size>8*1024*1024)throw new AppError(413,"Maximum file size is 8 MB");
  const metadata=await sharp(req.file.buffer,{limitInputPixels:40_000_000}).metadata().catch(()=>null);
  if(!metadata||!["jpeg","png","webp"].includes(metadata.format??""))throw new AppError(415,"Only valid JPEG, PNG and WebP images are accepted");
  const clean=await sharp(req.file.buffer,{limitInputPixels:40_000_000}).rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).jpeg({quality:88}).toBuffer({resolveWithObject:true});
  const objectKey=`uploads/${req.auth?.userId??"guest"}/${randomUUID()}.jpg`;
  await minio.send(new PutObjectCommand({Bucket:env.MINIO_BUCKET,Key:objectKey,Body:clean.data,ContentType:"image/jpeg"}));
  const upload=await prisma.imageUpload.create({data:{userId:req.auth?.userId,objectKey,mimeType:"image/jpeg",size:clean.data.length,width:clean.info.width,height:clean.info.height,exifRemoved:true}});
  res.status(201).json({upload,privacyWarning:"Before uploading, crop or blur faces, addresses, bills, documents, private screens and valuable possessions. In production, the sanitized image is sent to the configured vision provider for analysis."});
};

export const signedUpload:RequestHandler=async(_req,res)=>{
  const key=`uploads/direct/${randomUUID()}.jpg`;
  const command=new PutObjectCommand({Bucket:env.MINIO_BUCKET,Key:key,ContentType:"image/jpeg"});
  res.json({objectKey:key,url:await getSignedUrl(minio,command,{expiresIn:15*60})});
};

export const analyze:RequestHandler=async(req,res)=>{
  const isFixture=req.body.fixture==="desk-fixture";
  let objects:any[]=isFixture?[{label:"Laptop",category:"laptops",confidence:.96,confirmed:false,attributes:{source:"known-fixture"}},{label:"Desk",category:"desks",confidence:.93,confirmed:false,attributes:{source:"known-fixture"}},{label:"Mouse",category:"mice",confidence:.91,confirmed:false,attributes:{source:"known-fixture"}}]:[];
  let provider="manual-fallback",sceneType="unknown collection",confidence=.2,suggestedOutcomes:string[]=[],missingInformation=["Manual item confirmation","Another image","Model names and specifications"];

  if(isFixture){provider="known-fixture";sceneType="known test collection";confidence=.94;missingInformation=["Confirm the fixture items"]}
  else if(req.body.uploadId){
    const upload=await prisma.imageUpload.findUnique({where:{id:String(req.body.uploadId)}});
    if(!upload)throw new AppError(404,"Upload not found","UPLOAD_NOT_FOUND");
    if(upload.userId&&upload.userId!==req.auth?.userId)throw new AppError(404,"Upload not found","UPLOAD_NOT_FOUND");
    const stored=await minio.send(new GetObjectCommand({Bucket:env.MINIO_BUCKET,Key:upload.objectKey}));
    const bytes=await stored.Body?.transformToByteArray();
    if(bytes){
      const buffer=Buffer.from(bytes);
      const categories=await prisma.productCategory.findMany({select:{slug:true,name:true}});
      const vision=await analyzeImageWithVision(buffer,categories);
      if(vision){objects=vision.objects;provider=vision.provider;sceneType=vision.sceneType;confidence=vision.confidence;suggestedOutcomes=vision.suggestedOutcomes;missingInformation=["Confirm every suggested item and category","Add anything the image analysis missed",...vision.missingInformation]}
      else{
        const local=await analyzeImageLocally(buffer);
        if(local?.length){objects=await classifyOcrObjects(local);provider="local-macos-vision-ocr";sceneType="items with readable packaging";confidence=.78;missingInformation=["Confirm every item name and category","Add anything OCR missed"]}
      }
    }
  }

  const session=await prisma.analysisSession.create({data:{uploadId:req.body.uploadId,guestId:req.body.guestId,sceneType,confidence,category:isFixture?"Known fixture":provider==="multimodal-vision"?"AI-assisted inventory":provider==="local-macos-vision-ocr"?"OCR-assisted items":null,suggestedOutcomes,missingInformation,objects:{create:objects}},include:{objects:true}});
  const truthfulnessNotice=isFixture?"Known fixture matched predefined detections.":provider==="multimodal-vision"?(objects.length?"AI vision found possible items and visible label details. Confirm or correct every suggestion before continuing.":"AI vision could not identify any item confidently. Add the items manually or try a clearer photo."):provider==="local-macos-vision-ocr"?"Local OCR found possible items with readable text. Confirm or correct every suggestion; OCR reads visible text and is not general visual object recognition.":visionIsConfigured()?"The configured vision provider was temporarily unavailable or returned an invalid result. Nothing was guessed; add items manually or retry.":"Cloud image recognition is not configured on this server. Nothing was guessed; add items manually, or configure OPENAI_API_KEY for portable recognition.";
  res.status(201).json({session,provider,requiresManualConfirmation:!isFixture,truthfulnessNotice,capabilities:{portableVision:visionIsConfigured(),localOcr:process.platform==="darwin"}});
};

export const analyzeText:RequestHandler=async(req,res)=>{
  const [outcomes,categories]=await Promise.all([prisma.outcome.findMany({select:{name:true}}),prisma.productCategory.findMany({select:{slug:true,name:true,products:{select:{name:true,brand:true}}}})]);
  const ontology=categories.map(category=>({slug:category.slug,name:category.name,aliases:category.products.flatMap(product=>[product.name,product.brand])}));
  const response=await fetch(`${env.AI_URL}/v1/interpret`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:req.body.text,outcomes:outcomes.map(o=>o.name),categories:ontology,current_budget:req.body.currentBudget})}).catch(()=>null);
  if(!response?.ok)throw new AppError(503,"The text interpreter is unavailable. Check the deployed AI service URL.","AI_UNAVAILABLE");
  const interpretation:any=await response.json();
  const known=interpretation.owned_categories.map((category:string)=>({label:categories.find(c=>c.slug===category)?.name??category,category,attributes:{source:"explicit ownership language",intent:"owned"},confidence:.9,confirmed:false}));
  const knownDesired=(interpretation.desired_categories??[]).map((category:string)=>({label:categories.find(c=>c.slug===category)?.name??category,category,attributes:{source:"explicit requested addition",intent:"planned"},confidence:.86,confirmed:false}));
  const free=(interpretation.owned_items??[]).filter((item:string)=>!known.some((value:any)=>value.label.toLowerCase().includes(item.toLowerCase())||item.toLowerCase().includes(value.label.toLowerCase()))).map((item:string)=>({label:item.charAt(0).toUpperCase()+item.slice(1),category:item.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||"uncategorized",attributes:{source:"free-form ownership language",intent:"owned"},confidence:.76,confirmed:false}));
  const freeDesired=(interpretation.desired_items??[]).filter((item:string)=>![...knownDesired,...known,...free].some((value:any)=>value.label.toLowerCase().includes(item.toLowerCase())||item.toLowerCase().includes(value.label.toLowerCase()))).map((item:string)=>({label:item.charAt(0).toUpperCase()+item.slice(1),category:item.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||"uncategorized",attributes:{source:"free-form requested addition",intent:"planned"},confidence:.7,confirmed:false}));
  const session=await prisma.analysisSession.create({data:{guestId:req.header("x-guest-id")??undefined,sceneType:"text-described collection",confidence:interpretation.outcome_confidence,category:null,suggestedOutcomes:[interpretation.outcome],missingInformation:interpretation.clarifying_questions,objects:{create:[...known,...free,...knownDesired,...freeDesired]}},include:{objects:true}});
  res.status(201).json({interpretation,session,provider:"local-text-interpreter",explanation:"The interpreter preserves custom goals and separates owned items from requested additions. Confirm its interpretation before recommendations."});
};

export const confirmObjects:RequestHandler=async(req,res)=>{const session=await prisma.analysisSession.findUnique({where:{id:String(req.params.id)}});if(!session)throw new AppError(404,"Analysis session not found");await prisma.detectedObject.deleteMany({where:{sessionId:session.id}});const objects=await Promise.all(req.body.objects.map((o:any)=>prisma.detectedObject.create({data:{sessionId:session.id,label:o.label,category:o.category,brand:o.brand,model:o.model,attributes:o.attributes??{},confidence:o.confidence??1,confirmed:true}})));await prisma.analysisSession.update({where:{id:session.id},data:{status:"CONFIRMED"}});res.json({objects,status:"CONFIRMED"});};
export const recommendations:RequestHandler=async(req,res)=>res.status(201).json(await recommend(req.body,req.auth?.userId,req.header("x-guest-id")??undefined));
