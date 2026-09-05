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
  return <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3.5 text-sm text-indigo-950 shadow-sm dark:border-indigo-900 dark:from-indigo-950/60 dark:to-violet-950/40 dark:text-indigo-100"><span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm dark:bg-indigo-950"><LoaderCircle className="animate-spin text-indigo-600" size={24}/><Sparkles className="absolute text-amber-500" size={10}/></span><span><strong className="block">{title}</strong>{steps.length>0&&<small className="text-indigo-700 dark:text-indigo-300">{steps[index]}</small>}</span></div>;
}

export function InlineFeedback({message,tone="success",className="mt-3"}:{message?:string;tone?:"success"|"error"|"info";className?:string}){
  if(!message)return null;
  const styles=tone==="error"?"border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200":tone==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200":"border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200";
  const Icon=tone==="error"?CircleAlert:tone==="success"?CheckCircle2:Sparkles;
  return <p role={tone==="error"?"alert":"status"} aria-live="polite" className={`${className} flex items-start gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${styles}`}><Icon className="mt-0.5 shrink-0" size={17}/><span>{message}</span></p>;
}

export function LoadingPanel({title="Loading your workspace",detail="Bringing the latest information into place…"}:{title?:string;detail?:string}){
  return <div role="status" className="panel grid min-h-72 place-items-center overflow-hidden p-8 text-center"><div><span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-lg shadow-indigo-500/10 dark:from-indigo-950 dark:to-violet-950"><LoaderCircle className="animate-spin text-indigo-600 dark:text-indigo-300" size={34}/><Sparkles className="absolute right-2 top-2 animate-pulse text-amber-500" size={14}/></span><h2 className="mt-6 text-xl font-black tracking-tight">{title}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p><div className="mx-auto mt-6 flex w-32 gap-1.5">{[0,1,2].map(value=><span key={value} className="h-1.5 flex-1 animate-pulse rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" style={{animationDelay:`${value*180}ms`}}/>)}</div></div></div>;
}
