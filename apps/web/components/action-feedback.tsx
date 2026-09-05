"use client";

import {useEffect,useState} from "react";
import {CheckCircle2,CircleAlert,LoaderCircle,Sparkles} from "lucide-react";

export function releaseActionFocus(){
  requestAnimationFrame(()=>{const active=document.activeElement;if(active instanceof HTMLElement)active.blur()});
}

export function ActionLabel({busy,busyText,children}:{busy:boolean;busyText:string;children:React.ReactNode}){
  return <span className="inline-flex items-center justify-center gap-2">{busy?<LoaderCircle aria-hidden="true" className="animate-spin" size={17}/>:null}{busy?busyText:children}</span>;
}

export function ActivityIndicator({title,steps=[]}:{title:string;steps?:string[]}){
  const [index,setIndex]=useState(0);
  useEffect(()=>{if(steps.length<2)return;const timer=window.setInterval(()=>setIndex(value=>(value+1)%steps.length),1600);return()=>window.clearInterval(timer)},[steps.length]);
  return <div role="status" aria-live="polite" className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100"><span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white dark:bg-indigo-950"><LoaderCircle className="animate-spin text-indigo-600" size={24}/><Sparkles className="absolute text-amber-500" size={10}/></span><span><strong className="block">{title}</strong>{steps.length>0&&<small className="text-indigo-700 dark:text-indigo-300">{steps[index]}</small>}</span></div>;
}

export function InlineFeedback({message,tone="success",className="mt-3"}:{message?:string;tone?:"success"|"error"|"info";className?:string}){
  if(!message)return null;
  const styles=tone==="error"?"border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200":tone==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200":"border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200";
  const Icon=tone==="error"?CircleAlert:tone==="success"?CheckCircle2:Sparkles;
  return <p role={tone==="error"?"alert":"status"} aria-live="polite" className={`${className} flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold ${styles}`}><Icon className="mt-0.5 shrink-0" size={17}/><span>{message}</span></p>;
}

export function LoadingPanel({title="Loading your workspace",detail="Bringing the latest information into place…"}:{title?:string;detail?:string}){
  return <div role="status" className="panel grid min-h-64 place-items-center p-8 text-center"><div><span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950"><LoaderCircle className="animate-spin text-indigo-600" size={34}/><Sparkles className="absolute right-2 top-2 animate-pulse text-amber-500" size={14}/></span><h2 className="mt-5 text-lg font-black">{title}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p><div className="mx-auto mt-5 flex w-28 gap-1.5">{[0,1,2].map(value=><span key={value} className="h-1.5 flex-1 animate-pulse rounded-full bg-indigo-300" style={{animationDelay:`${value*180}ms`}}/>)}</div></div></div>;
}
