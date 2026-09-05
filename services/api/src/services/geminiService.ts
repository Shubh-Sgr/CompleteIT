import {env} from "../config/env.js";

type GeminiRequest={
  apiKey?:string;
  baseUrl?:string;
  model:string;
  fallbackModels?:string[];
  body:unknown;
  signal:AbortSignal;
  fetchImpl?:typeof fetch;
};

// A structured-output schema may be accepted by one Gemini generation while a
// different model returns a generic 400. Trying the configured fallbacks keeps
// a model-specific schema/capacity issue from becoming an empty user result.
const retryableStatuses=new Set([400,404,429,500,502,503,504]);

export async function generateGeminiContent(request:GeminiRequest){
  const apiKey=request.apiKey??env.GEMINI_API_KEY;
  if(!apiKey)return null;
  const baseUrl=(request.baseUrl??env.GEMINI_BASE_URL).replace(/\/$/,"");
  const configuredFallbacks=request.fallbackModels??env.GEMINI_FALLBACK_MODELS.split(",").map(value=>value.trim()).filter(Boolean);
  const models=[...new Set([request.model,...configuredFallbacks])];
  const fetchImpl=request.fetchImpl??fetch;
  let lastResponse:Response|null=null;

  for(const model of models){
    const response=await fetchImpl(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,{
      method:"POST",
      headers:{"x-goog-api-key":apiKey,"content-type":"application/json"},
      body:JSON.stringify(request.body),
      signal:request.signal
    });
    if(response.ok)return response;
    lastResponse=response;
    if(!retryableStatuses.has(response.status))break;
  }
  return lastResponse;
}

export async function geminiErrorSummary(response:Response|null){
  if(!response)return "no response";
  const payload:any=await response.clone().json().catch(()=>null);
  const message=typeof payload?.error?.message==="string"?payload.error.message.slice(0,240):response.statusText;
  return `${response.status}${message?`: ${message}`:""}`;
}
