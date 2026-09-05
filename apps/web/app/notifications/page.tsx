"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Bell,CheckCheck,ExternalLink,MessageCircle,RefreshCw,Sparkles,Star,UserPlus} from "lucide-react";
import {ActionLabel,InlineFeedback,LoadingPanel,releaseActionFocus} from "@/components/action-feedback";
import {api,timeAgo} from "@/lib/api";

const icons:Record<string,typeof Bell>={COMMENT:MessageCircle,RATING:Star,SUGGESTION:Sparkles,FOLLOW:UserPlus};

export default function Notifications(){
  const router=useRouter(),queryClient=useQueryClient();
  const {data,error,isLoading}=useQuery({queryKey:["notifications"],queryFn:()=>api<any>("/notifications"),retry:false,refetchInterval:30_000});
  const [filter,setFilter]=useState<"all"|"unread">("all"),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
  const notifications=data?.notifications??[],visible=filter==="unread"?notifications.filter((item:any)=>!item.readAt):notifications;
  async function refresh(){await Promise.all([queryClient.invalidateQueries({queryKey:["notifications"]}),queryClient.invalidateQueries({queryKey:["notification-summary"]})])}
  async function setRead(id:string,read:boolean){setBusy(id);setNotice("");try{await api(`/notifications/${id}`,{method:"PATCH",body:JSON.stringify({read})});await refresh()}catch(value){setNotice((value as Error).message)}finally{setBusy("");releaseActionFocus()}}
  async function readAll(){setBusy("all");setNotice("");try{await api("/notifications/read-all",{method:"PATCH"});setNotice("All notifications marked as read.");await refresh()}catch(value){setNotice((value as Error).message)}finally{setBusy("");releaseActionFocus()}}
  async function open(item:any){if(!item.readAt)await setRead(item.id,true);if(item.href)router.push(item.href)}
  if(isLoading)return <LoadingPanel title="Opening your notifications" detail="Checking new ratings, comments, suggestions, and followers…"/>;
  if(error)return <div className="panel mx-auto max-w-xl p-8 text-center"><Bell className="mx-auto text-indigo-600"/><h1 className="mt-4 text-2xl font-black">Your notification inbox is private</h1><p className="mt-2 text-slate-500">Log in to see activity related to your sets.</p><Link href="/login" className="link mt-4 inline-block">Log in</Link></div>;
  return <div className="mx-auto max-w-3xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Inbox</p><h1 className="display mt-3">Notifications</h1><p className="mt-3 text-slate-500"><strong className="text-indigo-600">{data?.unreadCount??0} unread</strong> · {data?.total??0} recent notifications</p></div><button disabled={busy==="all"||!data?.unreadCount} onClick={readAll} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40"><CheckCheck size={17}/><ActionLabel busy={busy==="all"} busyText="Marking…">Mark all read</ActionLabel></button></div>
    <div className="mt-7 flex gap-2" role="group" aria-label="Notification filter"><button onClick={()=>setFilter("all")} className={`rounded-full px-4 py-2 text-sm font-bold ${filter==="all"?"bg-indigo-600 text-white":"border"}`}>All</button><button onClick={()=>setFilter("unread")} className={`rounded-full px-4 py-2 text-sm font-bold ${filter==="unread"?"bg-indigo-600 text-white":"border"}`}>Unread · {data?.unreadCount??0}</button></div>
    <InlineFeedback message={notice} tone={notice.startsWith("All")?"success":"error"}/>
    <div className="mt-6 space-y-3">{visible.map((item:any)=>{const Icon=icons[item.type]??Bell;return <article className={`panel relative overflow-hidden p-5 ${item.readAt?"opacity-75":"border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/25"}`} key={item.id}>{!item.readAt&&<span className="absolute inset-y-0 left-0 w-1 bg-indigo-600"/>}<div className="flex gap-4"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.readAt?"bg-slate-100 text-slate-500 dark:bg-slate-800":"bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"}`}><Icon size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><b>{item.title}</b>{!item.readAt&&<span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span>}</div>{item.setTitle&&<p className="mt-1 text-xs font-bold text-indigo-600">Set: {item.setTitle}</p>}</div><small className="text-slate-400">{timeAgo(item.createdAt)}</small></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p><div className="mt-4 flex flex-wrap gap-2">{item.href&&<button onClick={()=>open(item)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Open related activity <ExternalLink size={14}/></button>}<button disabled={busy===item.id} onClick={()=>setRead(item.id,!item.readAt)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={busy===item.id?"animate-spin":""} size={14}/>{item.readAt?"Mark unread":"Mark read"}</button></div></div></div></article>})}
      {visible.length===0&&<div className="panel p-10 text-center"><CheckCheck className="mx-auto text-emerald-500" size={34}/><h2 className="mt-4 text-xl font-black">{filter==="unread"?"You’re all caught up":"No notifications yet"}</h2><p className="mt-2 text-sm text-slate-500">{filter==="unread"?"New activity will appear here.":"Ratings, comments, suggestions, and follows will appear with links to their source."}</p></div>}
    </div>
  </div>;
}
