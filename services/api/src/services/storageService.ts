import {createHash} from "node:crypto";
import {GetObjectCommand,PutObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {env} from "../config/env.js";
import {AppError} from "../errors/AppError.js";

const storageHost=/^https?:\/\//i.test(env.MINIO_ENDPOINT)?env.MINIO_ENDPOINT:`${env.MINIO_USE_SSL==="true"?"https":"http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;
const storageUrl=new URL(storageHost);
const isBackblaze=storageUrl.hostname.endsWith("backblazeb2.com");
const s3=new S3Client({endpoint:storageHost,region:env.MINIO_REGION,forcePathStyle:env.MINIO_FORCE_PATH_STYLE==="true",requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED",credentials:{accessKeyId:env.MINIO_ACCESS_KEY,secretAccessKey:env.MINIO_SECRET_KEY}});

type BackblazeAuthorization={
  authorizationToken:string;
  apiInfo:{storageApi:{apiUrl:string;downloadUrl:string;allowed?:{buckets?:Array<{id:string;name:string|null}>}}};
};

let cachedAuthorization:{value:BackblazeAuthorization;expiresAt:number}|undefined;

async function responseMessage(response:Response){
  const body=await response.json().catch(()=>null) as {code?:string;message?:string}|null;
  return [body?.code,body?.message].filter(Boolean).join(": ")||`HTTP ${response.status}`;
}

async function authorizeBackblaze(force=false){
  if(!force&&cachedAuthorization&&cachedAuthorization.expiresAt>Date.now())return cachedAuthorization.value;
  const credentials=Buffer.from(`${env.MINIO_ACCESS_KEY}:${env.MINIO_SECRET_KEY}`).toString("base64");
  const response=await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account",{headers:{authorization:`Basic ${credentials}`},signal:AbortSignal.timeout(15_000)}).catch(()=>null);
  if(!response?.ok)throw new AppError(502,`Object storage authorization failed${response?`: ${await responseMessage(response)}`:""}`,"STORAGE_UNAVAILABLE");
  const authorization=await response.json() as BackblazeAuthorization;
  if(!authorization.authorizationToken||!authorization.apiInfo?.storageApi?.apiUrl||!authorization.apiInfo.storageApi.downloadUrl)throw new AppError(502,"Object storage returned an invalid authorization response","STORAGE_UNAVAILABLE");
  cachedAuthorization={value:authorization,expiresAt:Date.now()+23*60*60*1000};
  return authorization;
}

function bucketId(authorization:BackblazeAuthorization){
  const buckets=authorization.apiInfo.storageApi.allowed?.buckets??[];
  const bucket=buckets.find(candidate=>candidate.name===env.MINIO_BUCKET)??(buckets.length===1?buckets[0]:undefined);
  if(!bucket?.id)throw new AppError(502,`The storage key is not scoped to bucket ${env.MINIO_BUCKET}`,"STORAGE_BUCKET_NOT_ALLOWED");
  return bucket.id;
}

async function uploadToBackblaze(key:string,body:Buffer,contentType:string,retry=true):Promise<void>{
  const authorization=await authorizeBackblaze(!retry);
  const uploadUrlResponse=await fetch(`${authorization.apiInfo.storageApi.apiUrl}/b2api/v4/b2_get_upload_url`,{method:"POST",headers:{authorization:authorization.authorizationToken,"content-type":"application/json"},body:JSON.stringify({bucketId:bucketId(authorization)}),signal:AbortSignal.timeout(15_000)}).catch(()=>null);
  if(!uploadUrlResponse?.ok){
    if(retry&&uploadUrlResponse&&[401,503].includes(uploadUrlResponse.status)){cachedAuthorization=undefined;return uploadToBackblaze(key,body,contentType,false)}
    throw new AppError(502,`Object storage could not create an upload URL${uploadUrlResponse?`: ${await responseMessage(uploadUrlResponse)}`:""}`,"STORAGE_UNAVAILABLE");
  }
  const uploadTarget=await uploadUrlResponse.json() as {uploadUrl?:string;authorizationToken?:string};
  if(!uploadTarget.uploadUrl||!uploadTarget.authorizationToken)throw new AppError(502,"Object storage returned an invalid upload URL","STORAGE_UNAVAILABLE");
  const response=await fetch(uploadTarget.uploadUrl,{method:"POST",headers:{authorization:uploadTarget.authorizationToken,"x-bz-file-name":key.split("/").map(encodeURIComponent).join("/"),"x-bz-content-sha1":createHash("sha1").update(body).digest("hex"),"content-type":contentType,"content-length":String(body.length)},body:Uint8Array.from(body).buffer,signal:AbortSignal.timeout(60_000)}).catch(()=>null);
  if(!response?.ok){
    if(retry&&response&&[401,408,503].includes(response.status)){cachedAuthorization=undefined;return uploadToBackblaze(key,body,contentType,false)}
    throw new AppError(502,`Object storage upload failed${response?`: ${await responseMessage(response)}`:""}`,"STORAGE_UPLOAD_FAILED");
  }
}

async function downloadFromBackblaze(key:string,retry=true):Promise<Buffer>{
  const authorization=await authorizeBackblaze(!retry);
  const bucket=encodeURIComponent(env.MINIO_BUCKET);
  const objectName=key.split("/").map(encodeURIComponent).join("/");
  const response=await fetch(`${authorization.apiInfo.storageApi.downloadUrl}/file/${bucket}/${objectName}`,{headers:{authorization:authorization.authorizationToken},signal:AbortSignal.timeout(60_000)}).catch(()=>null);
  if(!response?.ok){
    if(retry&&response?.status===401){cachedAuthorization=undefined;return downloadFromBackblaze(key,false)}
    throw new AppError(response?.status===404?404:502,`Object storage download failed${response?`: ${await responseMessage(response)}`:""}`,response?.status===404?"STORAGE_OBJECT_NOT_FOUND":"STORAGE_UNAVAILABLE");
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function storeObject(key:string,body:Buffer,contentType:string){
  if(isBackblaze)return uploadToBackblaze(key,body,contentType);
  await s3.send(new PutObjectCommand({Bucket:env.MINIO_BUCKET,Key:key,Body:body,ContentLength:body.length,ContentType:contentType}));
}

export async function readObject(key:string){
  if(isBackblaze)return downloadFromBackblaze(key);
  const stored=await s3.send(new GetObjectCommand({Bucket:env.MINIO_BUCKET,Key:key}));
  const bytes=await stored.Body?.transformToByteArray();
  if(!bytes)throw new AppError(502,"Object storage returned an empty response","STORAGE_UNAVAILABLE");
  return Buffer.from(bytes);
}

export async function createSignedUploadUrl(key:string,contentType:string){
  const command=new PutObjectCommand({Bucket:env.MINIO_BUCKET,Key:key,ContentType:contentType});
  return getSignedUrl(s3,command,{expiresIn:15*60});
}
