import {ErrorPanel} from "@/components/page-state"; import Link from "@/lib/navigation";
import {useRouter} from "@/lib/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Bell,CheckCheck,ExternalLink,MessageCircle,RefreshCw,Sparkles,Star,UserPlus} from "lucide-react";
import {ActionLabel,InlineFeedback,LoadingPanel,releaseActionFocus} from "@/components/action-feedback";
import {api,timeAgo} from "@/lib/api";

const icons:Record<string,typeof Bell>={COMMENT:MessageCircle,RATING:Star,SUGGESTION:Sparkles,FOLLOW:UserPlus};
const iconStyles:Record<string,string>={COMMENT:"bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",RATING:"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",SUGGESTION:"bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",FOLLOW:"bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"};

export default function Notifications(){
  const router=useRouter(),queryClient=useQueryClient();
  const {data,error,isLoading,refetch}=useQuery({queryKey:["notifications"],queryFn:()=>api<any>("/notifications"),retry:false,refetchInterval:30_000});
  const [filter,setFilter]=useState<"all"|"unread">("all"),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
  const notifications=data?.notifications??[],visible=filter==="unread"?notifications.filter((item:any)=>!item.readAt):notifications;
  async function refresh(){await Promise.all([queryClient.invalidateQueries({queryKey:["notifications"]}),queryClient.invalidateQueries({queryKey:["notification-summary"]})])}
  async function setRead(id:string,read:boolean){setBusy(id);setNotice("");try{await api(`/notifications/${id}`,{method:"PATCH",body:JSON.stringify({read})});await refresh()}catch(value){setNotice((value as Error).message)}finally{setBusy("");releaseActionFocus()}}
  async function readAll(){setBusy("all");setNotice("");try{await api("/notifications/read-all",{method:"PATCH"});setNotice("Everything is marked as read.");await refresh()}catch(value){setNotice((value as Error).message)}finally{setBusy("");releaseActionFocus()}}
  async function open(item:any){if(!item.readAt)await setRead(item.id,true);if(item.href)router.push(item.href)}
  if(isLoading)return <LoadingPanel title="Opening your inbox" detail="Gathering new ratings, comments, suggestions, and followers…"/>;
  if(error)return <ErrorPanel error={error} onRetry={refetch} headingLevel={1}/>;

  return <div className="mx-auto max-w-4xl">
    <section className="page-header sm:flex sm:items-end sm:justify-between"><div className="relative z-10"><h1 className="mt-3 page-title">Your inbox</h1><p className="mt-3 text-slate-500"><strong className="text-indigo-600 dark:text-indigo-300">{data?.unreadCount??0} unread</strong> · {data?.total??0} recent updates</p></div><button disabled={busy==="all"||!data?.unreadCount} onClick={readAll} className="btn-secondary relative z-10 mt-6 sm:mt-0"><CheckCheck size={17}/><ActionLabel busy={busy==="all"} busyText="Marking…">Mark all read</ActionLabel></button></section>
    <div className="mt-8 flex gap-2" role="group" aria-label="Notification filter"><button onClick={()=>setFilter("all")} className={`chip !px-4 !py-2 ${filter==="all"?"!border-indigo-500 !bg-indigo-600 !text-white":""}`}>All activity</button><button onClick={()=>setFilter("unread")} className={`chip !px-4 !py-2 ${filter==="unread"?"!border-indigo-500 !bg-indigo-600 !text-white":""}`}>Unread <span className="rounded-full bg-current/10 px-1.5">{data?.unreadCount??0}</span></button></div>
    <InlineFeedback message={notice} tone={notice.startsWith("Everything")?"success":"error"}/>
    <div className="mt-5 space-y-3">{visible.map((item:any)=>{const Icon=icons[item.type]??Bell;return <article className={`panel relative overflow-hidden p-5 sm:p-6 ${item.readAt?"":"!border-indigo-300 bg-indigo-50/40 dark:!border-indigo-800 dark:bg-indigo-950/20"}`} key={item.id}>{!item.readAt&&<span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500"/>}<div className="flex gap-4"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${iconStyles[item.type]??"bg-slate-100 text-slate-600 dark:bg-slate-800"}`}><Icon size={21}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{item.title}</h2>{!item.readAt&&<span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-white">New</span>}</div>{item.setTitle&&<p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">{item.setTitle}</p>}</div><small className="text-slate-400">{timeAgo(item.createdAt)}</small></div><p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p><div className="mt-4 flex flex-wrap gap-2">{item.href&&<button onClick={()=>open(item)} className="btn-primary !min-h-9 !rounded-xl !px-3 text-xs">View activity <ExternalLink size={14}/></button>}<button disabled={busy===item.id} onClick={()=>setRead(item.id,!item.readAt)} className="btn-secondary !min-h-9 !rounded-xl !px-3 text-xs"><RefreshCw className={busy===item.id?"animate-spin":""} size={14}/>{item.readAt?"Mark unread":"Mark read"}</button></div></div></div></article>})}
      {visible.length===0&&<div className="empty-state"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><CheckCheck size={28}/></span><h2 className="mt-5 text-xl font-black">{filter==="unread"?"You’re all caught up":"No activity yet"}</h2><p className="mt-2 text-sm text-slate-500">{filter==="unread"?"New updates will appear here as they happen.":"Ratings, comments, suggestions, and follows will appear with direct links."}</p></div>}
    </div>
  </div>;
}
