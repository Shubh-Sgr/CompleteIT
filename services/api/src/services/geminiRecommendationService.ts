import {z} from "zod";
import {env} from "../config/env.js";
import {generateGeminiContent,geminiErrorSummary} from "./geminiService.js";

const suggestion=z.object({
  label:z.string().min(2).max(120),
  category:z.string().min(1).max(80),
  reason:z.string().min(5).max(240),
  priority:z.enum(["ESSENTIAL","USEFUL","OPTIONAL"])
});

const planResult=z.object({
  summary:z.string().min(5).max(320),
  suggestions:z.array(suggestion).max(8),
  insights:z.array(z.string().min(3).max(240)).max(5)
});

const planSchema={type:"object",additionalProperties:false,required:["summary","suggestions","insights"],properties:{summary:{type:"string"},suggestions:{type:"array",items:{type:"object",additionalProperties:false,required:["label","category","reason","priority"],properties:{label:{type:"string"},category:{type:"string"},reason:{type:"string"},priority:{type:"string",enum:["ESSENTIAL","USEFUL","OPTIONAL"]}}}},insights:{type:"array",items:{type:"string"}}}} as const;

function outputText(payload:any){
  for(const candidate of payload?.candidates??[])for(const part of candidate?.content?.parts??[])if(typeof part?.text==="string")return part.text;
  return "";
}

export type GoalPlan=z.infer<typeof planResult>&{provider:"gemini-goal-planner"};

const genericGoal=/\b(complete|improve|organize|finish|upgrade|protect|maintain|add to)\b.*\b(what i (already )?have|my (items|set|collection)|this (set|collection)|it)\b/i;
const ignoredWords=new Set(["already","and","brand","collection","complete","existing","for","grocery","items","planned","set","the","thing","things","use","what","with"]);
const significantWords=(value:string)=>new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter(word=>word.length>2&&!ignoredWords.has(word))??[]);

function isGrounded(plan:z.infer<typeof planResult>,input:{outcome:string;ownedItems:Array<{label:string;category:string;brand?:string}>}){
  if(!genericGoal.test(input.outcome)||input.ownedItems.length===0)return true;
  const anchors=significantWords(input.ownedItems.map(item=>`${item.label} ${item.category} ${item.brand??""}`).join(" "));
  const response=significantWords(`${plan.summary} ${plan.insights.join(" ")} ${plan.suggestions.map(item=>`${item.label} ${item.category} ${item.reason}`).join(" ")}`);
  return [...anchors].some(word=>response.has(word));
}

export async function planGoalWithGemini(input:{
  outcome:string;
  notes?:string;
  budget:number;
  preference:string;
  ownedItems:Array<{label:string;category:string;brand?:string}>;
  plannedItems:Array<{label:string;category:string;brand?:string}>;
  categories:Array<{slug:string;name:string;products:Array<{name:string;brand:string}>}>;
},options:{apiKey?:string;baseUrl?:string;model?:string;fallbackModels?:string[];timeoutMs?:number;fetchImpl?:typeof fetch}={}):Promise<GoalPlan|null>{
  if(!(options.apiKey??env.GEMINI_API_KEY))return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs??env.GEMINI_TEXT_TIMEOUT_MS);
  const catalogue=input.categories.map(category=>`${category.slug} (${category.name}): ${category.products.map(product=>product.name).join(", ")||"no products"}`).join("\n");
  const prompt=`Create a practical completion plan for the user's exact goal. The confirmed items below are authoritative context, not examples. If the goal says \"what I have\", \"this set\", \"it\", or is otherwise vague, resolve it exclusively from those confirmed items. Never introduce a new project, hobby, room, or product domain that is absent from both the goal and the confirmed items. The first sentence of the summary must name the current collection's real domain. Identify genuinely missing items or actions; do not repeat anything already owned or already planned. Be category-neutral and do not assume the goal is about gaming, computers, or home setup. Respect the budget when it is above zero. Return 2-8 concise suggestions, ordered by importance. When a suggestion matches a catalogue product, use that exact product name and its exact category slug. Otherwise use a concise free-form label and the best fitting known category slug, or \"uncategorized\" if none fits. Do not invent product claims, prices, or compatibility.

Goal: ${input.outcome}
Additional context: ${input.notes||"None supplied"}
Budget: ${input.budget>0?`INR ${input.budget}`:"No purchase budget supplied"}
Condition preference: ${input.preference}
Already owned: ${input.ownedItems.map(item=>`${item.label}${item.brand?` by ${item.brand}`:""} [${item.category}]`).join(", ")||"Nothing confirmed"}
Already planned: ${input.plannedItems.map(item=>`${item.label}${item.brand?` by ${item.brand}`:""} [${item.category}]`).join(", ")||"Nothing confirmed"}

Available catalogue (suggest exact names only from this list):
${catalogue}`;
  try{
    const response=await generateGeminiContent({apiKey:options.apiKey,baseUrl:options.baseUrl,model:options.model??env.GEMINI_TEXT_MODEL,fallbackModels:options.fallbackModels,fetchImpl:options.fetchImpl,signal:controller.signal,body:{contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:planSchema}}});
    if(!response?.ok){console.warn(`Gemini goal planning unavailable (${await geminiErrorSummary(response)})`);return null}
    const parsed=planResult.parse(JSON.parse(outputText(await response.json())));
    if(!isGrounded(parsed,input)){console.warn("Gemini goal planning rejected because it drifted away from the confirmed items");return null}
    return {...parsed,provider:"gemini-goal-planner"};
  }catch(error){console.warn(`Gemini goal planning failed (${error instanceof Error?error.message:"invalid response"})`);return null}
  finally{clearTimeout(timer)}
}
