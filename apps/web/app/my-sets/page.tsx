import {ErrorPanel} from "@/components/page-state";
import Link from "@/lib/navigation";
import {usePathname,useRouter} from "@/lib/navigation";
import {useMemo,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Archive,Filter,Layers3,Plus,Search,X} from "lucide-react";
import {api} from "@/lib/api";
import {SetCard} from "@/components/set-card";

type Tab="All"|"Drafts"|"Private"|"Followers-only"|"Published"|"Unlisted"|"Forked"|"Following"|"Archived";
const tabs:Tab[]=["All","Drafts","Private","Followers-only","Published","Unlisted","Forked","Following","Archived"];
const paths:Record<Tab,string>={All:"/my-sets",Drafts:"/my-sets/drafts",Private:"/my-sets/private","Followers-only":"/my-sets/followers",Published:"/my-sets/published",Unlisted:"/my-sets/unlisted",Forked:"/my-sets/forked",Following:"/my-sets/following",Archived:"/my-sets/archived"};
function tabFromPath(path:string):Tab{return (Object.entries(paths).find(([,value])=>value===path)?.[0] as Tab)??"All"}
function matches(set:any,tab:Tab){switch(tab){case"Drafts":return set.status==="DRAFT";case"Private":return set.visibility==="PRIVATE";case"Followers-only":return set.visibility==="FOLLOWERS";case"Published":return set.visibility==="PUBLIC"&&["ACTIVE","COMPLETED"].includes(set.status);case"Unlisted":return set.visibility==="UNLISTED";case"Forked":return set.setType==="FORK";case"Archived":return set.status==="ARCHIVED";default:return true}}

export default function MySets(){
  const pathname=usePathname(),router=useRouter(),active=tabFromPath(pathname);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("updated-desc");
  const {data,error,isLoading,refetch}=useQuery({queryKey:["my-sets"],queryFn:()=>api<any>("/sets/mine"),retry:false});
  const owned=data?.sets??[],following=data?.following??[];
  const counts=useMemo(()=>Object.fromEntries(tabs.map(tab=>[tab,tab==="Following"?following.length:owned.filter((set:any)=>matches(set,tab)).length])),[owned,following]);
  const visible=useMemo(()=>{const source=active==="Following"?following:owned.filter((set:any)=>matches(set,active));const needle=query.trim().toLowerCase();return source.filter((set:any)=>!needle||[set.title,set.description,set.outcome,set.setType].some(value=>String(value??"").toLowerCase().includes(needle))).sort((a:any,b:any)=>sort==="updated-asc"?new Date(a.updatedAt).getTime()-new Date(b.updatedAt).getTime():sort==="name"?a.title.localeCompare(b.title):sort==="budget-asc"?a.budget-b.budget:sort==="budget-desc"?b.budget-a.budget:new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime())},[active,following,owned,query,sort]);
  const totalForView=active==="Following"?following.length:owned.length;
  function selectTab(tab:Tab){router.replace(paths[tab],{scroll:false})}

  return <div>
    <section className="page-header sm:flex sm:items-end sm:justify-between"><div className="relative z-10"><h1 className="page-title">My Sets</h1><p className="mt-4 max-w-xl text-slate-500">Everything you are building, following, improving, and ready to share—in one focused place.</p>{data&&<div className="mt-6 flex flex-wrap gap-2"><span className="chip">{owned.length} created</span><span className="chip">{counts.Published} published</span><span className="chip">{following.length} followed</span></div>}</div><Link href="/create" className="btn-primary relative z-10 mt-7 sm:mt-0"><Plus size={18}/>Create a new set</Link></section>
    {error&&<ErrorPanel error={error} onRetry={refetch}/>}
    {!error&&<>
      <div className="scroll-row mt-8 flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Set filters">{tabs.map(tab=><button type="button" key={tab} aria-pressed={active===tab} onClick={()=>selectTab(tab)} className={`chip shrink-0 whitespace-nowrap !px-3.5 !py-2 ${active===tab?"!border-indigo-400 !bg-indigo-600 !text-white !shadow-lg !shadow-indigo-500/20":""}`}>{tab}<span className={`rounded-full px-1.5 py-0.5 text-xs ${active===tab?"bg-white/20":"bg-slate-100 dark:bg-slate-800"}`}>{counts[tab]??0}</span></button>)}</div>
      <div className="panel mt-3 grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><label className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input aria-label="Search my sets" value={query} onChange={event=>setQuery(event.target.value)} className="field w-full !pl-10 !pr-10" placeholder="Search your titles, goals, and descriptions…"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X size={16}/></button>}</label><label className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Filter size={17}/><span className="sr-only">Sort sets</span><select aria-label="Sort sets" className="field min-w-48" value={sort} onChange={event=>setSort(event.target.value)}><option value="updated-desc">Recently updated</option><option value="updated-asc">Oldest updated</option><option value="name">Name A–Z</option><option value="budget-asc">Budget low–high</option><option value="budget-desc">Budget high–low</option></select></label></div>
      {isLoading&&<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(value=><div className="skeleton h-[22rem]" key={value}/>)}</div>}
      {data&&<><div className="mt-8 flex items-center justify-between"><p role="status" className="text-sm font-bold text-slate-500">Showing {visible.length} of {totalForView}</p><p className="text-sm font-black text-indigo-600">{active}</p></div><div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map((set:any)=><SetCard key={set.id} set={set} meta={active==="Following"?`@${set.owner.username}`:`${set.visibility.toLowerCase()} · ${set.status.toLowerCase()}`}/>)}</div>{visible.length===0&&<div className="empty-state mt-8"><Archive className="mx-auto text-slate-400" size={34}/><h2 className="mt-4 text-xl font-black">No matching sets</h2><p className="mt-2 text-sm text-slate-500">{query?"Try a different search or clear it.":active==="Following"?"Follow a public set to keep it here.":`Nothing is currently in ${active.toLowerCase()}.`}</p>{(query||active!=="All")&&<button onClick={()=>{setQuery("");selectTab("All")}} className="btn-secondary mt-5">Clear filters</button>}</div>}</>}
    </>}
  </div>;
}
