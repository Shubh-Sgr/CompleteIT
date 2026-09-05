import {z} from "zod";
import {env} from "../config/env.js";
import {generateGeminiContent,geminiErrorSummary} from "./geminiService.js";

const interpretationResult=z.object({
  outcome:z.string().min(2).max(120),
  outcome_confidence:z.number().min(0).max(1),
  budget:z.number().int().min(0).max(1_000_000),
  width_cm:z.number().positive().nullable(),
  depth_cm:z.number().positive().nullable(),
  owned_categories:z.array(z.string().max(80)).max(20),
  desired_categories:z.array(z.string().max(80)).max(20),
  owned_items:z.array(z.string().max(120)).max(30),
  desired_items:z.array(z.string().max(120)).max(30),
  constraints:z.array(z.string().max(160)).max(20),
  style:z.string().max(80).nullable(),
  preference:z.enum(["NEW","USED","EITHER"]),
  clarifying_questions:z.array(z.string().max(200)).max(6),
  interpretation:z.array(z.string().max(240)).max(8)
});

const textSchema={type:"object",additionalProperties:false,required:["outcome","outcome_confidence","budget","width_cm","depth_cm","owned_categories","desired_categories","owned_items","desired_items","constraints","style","preference","clarifying_questions","interpretation"],properties:{outcome:{type:"string"},outcome_confidence:{type:"number",minimum:0,maximum:1},budget:{type:"integer",minimum:0,maximum:1000000},width_cm:{type:["number","null"]},depth_cm:{type:["number","null"]},owned_categories:{type:"array",items:{type:"string"}},desired_categories:{type:"array",items:{type:"string"}},owned_items:{type:"array",items:{type:"string"}},desired_items:{type:"array",items:{type:"string"}},constraints:{type:"array",items:{type:"string"}},style:{type:["string","null"]},preference:{type:"string",enum:["NEW","USED","EITHER"]},clarifying_questions:{type:"array",items:{type:"string"}},interpretation:{type:"array",items:{type:"string"}}}} as const;

function outputText(payload:any){
  for(const candidate of payload?.candidates??[])for(const part of candidate?.content?.parts??[])if(typeof part?.text==="string")return part.text;
  return "";
}

export async function analyzeTextWithGemini(input:{text:string;currentBudget?:number;outcomes:string[];categories:Array<{slug:string;name:string}>},options:{apiKey?:string;baseUrl?:string;model?:string;fallbackModels?:string[];timeoutMs?:number;fetchImpl?:typeof fetch}={}){
  if(!(options.apiKey??env.GEMINI_API_KEY))return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs??env.GEMINI_TEXT_TIMEOUT_MS);
  const prompt=`Interpret the user's collection goal without forcing it into a preset category. Separate only explicitly owned items from items they want to add. Preserve unfamiliar items as concise free-form names. Use a known category slug only when it clearly fits; otherwise leave it out of the category arrays and put the item in owned_items or desired_items. Infer budget and dimensions only when stated. Keep outcome under 120 characters. Ask at most two genuinely useful clarifying questions. Known outcomes: ${input.outcomes.join(", ")}. Known categories: ${input.categories.map(category=>`${category.slug} (${category.name})`).join(", ")}. User request: ${input.text}${input.currentBudget?` Current budget: ${input.currentBudget}.`:""}`;
  try{
    const response=await generateGeminiContent({apiKey:options.apiKey,baseUrl:options.baseUrl,model:options.model??env.GEMINI_TEXT_MODEL,fallbackModels:options.fallbackModels,fetchImpl:options.fetchImpl,signal:controller.signal,body:{contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:textSchema}}});
    if(!response?.ok){console.warn(`Gemini text interpretation unavailable (${await geminiErrorSummary(response)})`);return null}
    const parsed=interpretationResult.parse(JSON.parse(outputText(await response.json())));
    return {...parsed,provider:"gemini-text-interpreter"};
  }catch(error){console.warn(`Gemini text interpretation failed (${error instanceof Error?error.message:"invalid response"})`);return null}
  finally{clearTimeout(timer)}
}
