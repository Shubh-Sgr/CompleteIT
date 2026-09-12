import {useEffect,useState} from "react";
import {CheckCircle2,CircleAlert,LoaderCircle,Sparkles} from "lucide-react";

export function releaseActionFocus(){
  // Never steal keyboard focus or blur a new field the user reached during a request.
  const active=document.activeElement;
  if(active instanceof HTMLButtonElement&&!active.matches(":focus-visible"))active.blur();
}

export function ActionLabel({busy,busyText,children}:{busy:boolean;busyText:string;children:React.ReactNode}){
  return <span className="inline-flex items-center justify-center gap-2">{busy?<LoaderCircle aria-hidden="true" className="animate-spin" size={17}/>:null}{busy?busyText:children}</span>;
}

export function ActivityIndicator({title,steps=[]}:{title:string;steps?:string[]}){
  const [index,setIndex]=useState(0);
  useEffect(()=>{if(steps.length<2)return;const timer=window.setInterval(()=>setIndex(value=>(value+1)%steps.length),1600);return()=>window.clearInterval(timer)},[steps.length]);
  return <div className="activity-indicator text-sm"><LoaderCircle aria-hidden="true" className="animate-spin shrink-0 text-indigo-600 dark:text-indigo-300" size={22}/><div><strong role="status" className="block">{title}</strong>{steps.length>0&&<small aria-hidden="true" className="text-slate-500">{steps[index]}</small>}</div></div>;
}

export function InlineFeedback({message,tone="success",className="mt-3"}:{message?:string;tone?:"success"|"error"|"info";className?:string}){
  if(!message)return null;
  const styles=tone==="error"?"border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200":tone==="success"?"border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200":"border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200";
  const Icon=tone==="error"?CircleAlert:tone==="success"?CheckCircle2:Sparkles;
  return <p role={tone==="error"?"alert":"status"} className={`${className} flex items-start gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold ${styles}`}><Icon aria-hidden="true" className="mt-0.5 shrink-0" size={17}/><span>{message}</span></p>;
}

export function LoadingPanel({title="Loading your workspace",detail="Bringing the latest information into place…"}:{title?:string;detail?:string}){
  return <div role="status" aria-busy="true" className="panel loading-panel"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{detail}</p><div aria-hidden="true" className="loading-skeletons"><div className="skeleton"/><div className="skeleton w-4/5"/><div className="skeleton w-3/5"/></div></div>;
}
