import {describe,expect,it,vi} from "vitest";
import {analyzeTextWithGemini} from "../src/services/geminiTextService.js";

const interpretation={outcome:"Complete a portable painting kit",outcome_confidence:.91,budget:3000,width_cm:null,depth_cm:null,owned_categories:["arts-and-crafts"],desired_categories:[],owned_items:["watercolour paints","brushes"],desired_items:["paper","masking tape"],constraints:["Portable"],style:null,preference:"EITHER",clarifying_questions:[],interpretation:["Separated the items already owned from requested additions."]};
const success=()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(interpretation)}]}}]}),{status:200,headers:{"content-type":"application/json"}});

describe("Gemini text interpretation",()=>{
  it("returns generic structured goals and owned/planned items",async()=>{const fetchImpl=vi.fn(async()=>success()) as any;const result=await analyzeTextWithGemini({text:"I have paints and brushes and want paper for a portable painting kit.",outcomes:[],categories:[{slug:"arts-and-crafts",name:"Arts and crafts"}]},{apiKey:"test-key",model:"gemini-test",fallbackModels:[],fetchImpl});expect(result).toMatchObject({provider:"gemini-text-interpreter",outcome:"Complete a portable painting kit",owned_items:["watercolour paints","brushes"],desired_items:["paper","masking tape"]})});
  it("uses a lower-cost fallback model after a capacity response",async()=>{const urls:string[]=[];const fetchImpl=vi.fn(async(url:any)=>{urls.push(String(url));return urls.length===1?new Response("quota",{status:429}):success()}) as any;const result=await analyzeTextWithGemini({text:"I have paints and want paper for a portable painting kit.",outcomes:[],categories:[]},{apiKey:"test-key",model:"gemini-primary",fallbackModels:["gemini-fallback"],fetchImpl});expect(result?.provider).toBe("gemini-text-interpreter");expect(urls).toEqual([expect.stringContaining("gemini-primary"),expect.stringContaining("gemini-fallback")])});
});
