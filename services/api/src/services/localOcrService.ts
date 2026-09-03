import {execFile} from "node:child_process";
import {access,stat,unlink,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {randomUUID} from "node:crypto";

type OcrRow={text:string;confidence:number;x:number;y:number;width:number;height:number};
export type OcrObject={label:string;category:string;brand?:string;confidence:number;confirmed:false;attributes:{source:string;evidenceLines:string[]}};

const run=promisify(execFile);
const scriptPath=fileURLToPath(new URL("../../scripts/macos-vision-ocr.swift",import.meta.url));
let binaryPromise:Promise<string>|undefined;

async function getBinary(){
  if(process.platform!=="darwin")return null;
  if(!binaryPromise)binaryPromise=(async()=>{const source=await stat(scriptPath);const binary=join(tmpdir(),`completeit-vision-ocr-${Math.round(source.mtimeMs)}`);try{await access(binary)}catch{await run("/usr/bin/swiftc",[scriptPath,"-o",binary],{timeout:30_000,maxBuffer:1024*1024})}return binary})();
  return binaryPromise;
}

function useful(text:string){return text.replace(/[^\p{L}\p{N}&'®+., -]/gu,"").replace(/\s+/g," ").trim()}
function isNoise(text:string){return /^(rich in|an eco|(?:[a-z]{0,4}\s*)?bhuj[ai]|net\b|per\b|no$|high$|refined$|sugar|added\b|whey$|source of|tra$|mervatives|amken$|richt$|pro$|\d+\s*(g|kg))\b/i.test(text)}

function horizontalOverlap(a:OcrRow,b:OcrRow){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))/Math.max(.001,Math.min(a.width,b.width))}
function verticalGap(a:OcrRow,b:OcrRow){return Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.height,b.y+b.height))}
function connected(a:OcrRow,b:OcrRow){return horizontalOverlap(a,b)>=.4&&verticalGap(a,b)<=.065}

export function rowsToObjects(rows:OcrRow[]):OcrObject[]{
  const clean=rows.filter(row=>row.confidence>=.45&&useful(row.text).length>=2).map(row=>({...row,text:useful(row.text)}));
  const seen=new Set<number>(),clusters:OcrRow[][]=[];
  for(let index=0;index<clean.length;index++){
    if(seen.has(index))continue;
    const cluster:OcrRow[]=[],queue=[index];seen.add(index);
    while(queue.length){const current=queue.shift()!;cluster.push(clean[current]!);for(let other=0;other<clean.length;other++)if(!seen.has(other)&&connected(clean[current]!,clean[other]!)){seen.add(other);queue.push(other)}}
    clusters.push(cluster);
  }
  return clusters.map(cluster=>{
    const evidence=[...new Set(cluster.sort((a,b)=>b.y-a.y||a.x-b.x).map(row=>row.text))];
    const selected=[...new Map(cluster.filter(row=>!isNoise(row.text)).sort((a,b)=>b.height-a.height||b.width-a.width).map(row=>[row.text.toLowerCase(),row.text.replace(/®/g,"").trim()])).values()].slice(0,5);
    const label=selected.join(" ").slice(0,120);
    return {label,category:"uncategorized",brand:selected[0],confidence:.78,confirmed:false as const,attributes:{source:"local-macos-vision-ocr",evidenceLines:evidence}};
  }).filter(object=>object.label.split(/\s+/).length>=2).sort((a,b)=>b.label.length-a.label.length);
}

export async function analyzeImageLocally(buffer:Buffer):Promise<OcrObject[]|null>{
  const binary=await getBinary().catch(()=>null);if(!binary)return null;
  const imagePath=join(tmpdir(),`completeit-ocr-${randomUUID()}.jpg`);
  try{await writeFile(imagePath,buffer);const {stdout}=await run(binary,[imagePath],{timeout:20_000,maxBuffer:4*1024*1024});return rowsToObjects(JSON.parse(stdout) as OcrRow[])}catch{return null}finally{await unlink(imagePath).catch(()=>{})}
}
