"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useMemo,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Archive,Filter,Plus,Search,X} from "lucide-react";
import {api} from "@/lib/api";
import {SetCard} from "@/components/set-card";

type Tab="All"|"Drafts"|"Private"|"Followers-only"|"Published"|"Unlisted"|"Forked"|"Following"|"Archived";
const tabs:Tab[]=["All","Drafts","Private","Followers-only","Published","Unlisted","Forked","Following","Archived"];
const paths:Record<Tab,string>={All:"/my-sets",Drafts:"/my-sets/drafts",Private:"/my-sets/private","Followers-only":"/my-sets/followers",Published:"/my-sets/published",Unlisted:"/my-sets/unlisted",Forked:"/my-sets/forked",Following:"/my-sets/following",Archived:"/my-sets/archived"};

function tabFromPath(path:string):Tab{return (Object.entries(paths).find(([,value])=>value===path)?.[0] as Tab)??"All"}
function matches(set:any,tab:Tab){
  switch(tab){
    case"Drafts":return set.status==="DRAFT";
    case"Private":return set.visibility==="PRIVATE";
    case"Followers-only":return set.visibility==="FOLLOWERS";
    case"Published":return set.visibility==="PUBLIC"&&["ACTIVE","COMPLETED"].includes(set.status);
    case"Unlisted":return set.visibility==="UNLISTED";
    case"Forked":return set.setType==="FORK";
    case"Archived":return set.status==="ARCHIVED";
    default:return true;
  }
}

export default function MySets(){
  const pathname=usePathname(),router=useRouter(),active=tabFromPath(pathname);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("updated-desc");
  const {data,error,isLoading}=useQuery({queryKey:["my-sets"],queryFn:()=>api<any>("/sets/mine"),retry:false});
  const owned=data?.sets??[],following=data?.following??[];
  const counts=useMemo(()=>Object.fromEntries(tabs.map(tab=>[tab,tab==="Following"?following.length:owned.filter((set:any)=>matches(set,tab)).length])),[owned,following]);
  const visible=useMemo(()=>{
    const source=active==="Following"?following:owned.filter((set:any)=>matches(set,active));
    const needle=query.trim().toLowerCase();
    return source.filter((set:any)=>!needle||[set.title,set.description,set.outcome,set.setType].some(value=>String(value??"").toLowerCase().includes(needle))).sort((a:any,b:any)=>sort==="updated-asc"?new Date(a.updatedAt).getTime()-new Date(b.updatedAt).getTime():sort==="name"?a.title.localeCompare(b.title):sort==="budget-asc"?a.budget-b.budget:sort==="budget-desc"?b.budget-a.budget:new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
  },[active,following,owned,query,sort]);
  const totalForView=active==="Following"?following.length:owned.length;
  function selectTab(tab:Tab){router.replace(paths[tab],{scroll:false})}

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Your library</p><h1 className="display mt-3">My Sets</h1><p className="mt-3 text-sm text-slate-500">Filter owned work, forks, archived drafts, and sets you follow.</p></div>
      <Link href="/create" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white"><Plus size={18}/>New set</Link>
    </div>
    {error&&<div className="panel mt-10 p-8 text-center"><h2 className="text-xl font-bold">Log in to see your sets</h2><p className="mt-2 text-slate-500">Your sets and followed library are private account data.</p><Link href="/login" className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white">Log in</Link></div>}
    {!error&&<>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Set filters">
        {tabs.map(tab=><button type="button" key={tab} aria-pressed={active===tab} onClick={()=>selectTab(tab)} className={`chip flex shrink-0 items-center gap-1.5 whitespace-nowrap ${active===tab?"!border-indigo-500 !bg-indigo-50 !text-indigo-700 dark:!bg-indigo-950 dark:!text-indigo-100":""}`}>{tab}<span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{counts[tab]??0}</span></button>)}
      </div>
      <div className="panel mt-4 grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input aria-label="Search my sets" value={query} onChange={event=>setQuery(event.target.value)} className="field w-full pl-9 pr-9" placeholder="Search title, outcome, description…"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X size={16}/></button>}</label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Filter size={16}/><span className="sr-only">Sort sets</span><select aria-label="Sort sets" className="field" value={sort} onChange={event=>setSort(event.target.value)}><option value="updated-desc">Recently updated</option><option value="updated-asc">Oldest updated</option><option value="name">Name A–Z</option><option value="budget-asc">Budget low–high</option><option value="budget-desc">Budget high–low</option></select></label>
      </div>
      {isLoading&&<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(value=><div className="skeleton h-80" key={value}/>)}</div>}
      {data&&<>
        <p className="mt-6 text-sm font-semibold text-slate-500">Showing {visible.length} of {totalForView} sets</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((set:any)=><div key={set.id} className="relative"><SetCard set={set}/><div className="absolute left-4 top-4 chip !bg-white/90 uppercase dark:!bg-slate-900/90">{active==="Following"?`@${set.owner.username}`:`${set.visibility.toLowerCase()} · ${set.status.toLowerCase()}`}</div></div>)}</div>
        {visible.length===0&&<div className="mt-8 rounded-2xl border border-dashed p-12 text-center"><Archive className="mx-auto text-slate-400"/><h2 className="mt-3 font-bold">No matching sets</h2><p className="mt-2 text-sm text-slate-500">{query?"Try a different search or clear it.":active==="Following"?"Follow a public set to keep it here.":`Nothing is currently in ${active.toLowerCase()}.`}</p>{(query||active!=="All")&&<button onClick={()=>{setQuery("");selectTab("All")}} className="mt-5 rounded-xl border px-4 py-2 text-sm font-bold">Clear filters</button>}</div>}
      </>}
    </>}
  </div>
}
