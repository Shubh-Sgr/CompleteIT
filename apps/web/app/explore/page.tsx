"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {ArrowRight,Compass,Globe2,Heart,Search,Tag} from "lucide-react";
import {ActionLabel,InlineFeedback,LoadingPanel,releaseActionFocus} from "@/components/action-feedback";
import {SetCard} from "@/components/set-card";
import {api} from "@/lib/api";

type TopicFeedback={slug:string;message:string;tone:"success"|"error"};

export default function Explore(){
  const router=useRouter(),queryClient=useQueryClient();
  const [busyTopic,setBusyTopic]=useState(""),[feedback,setFeedback]=useState<TopicFeedback>();
  const {data,isLoading,error}=useQuery({queryKey:["explore"],queryFn:()=>api<any>("/explore")});
  const worlds=useQuery({queryKey:["worlds"],queryFn:()=>api<any>("/product-worlds")});
  const topics=useQuery({queryKey:["topics"],queryFn:()=>api<any>("/topics")});
  async function toggleTopic(topic:any){setBusyTopic(topic.slug);setFeedback(undefined);try{await api(`/topics/${topic.slug}/follow`,{method:topic.isFollowing?"DELETE":"POST"});setFeedback({slug:topic.slug,message:topic.isFollowing?`${topic.name} unfollowed.`:`${topic.name} followed.`,tone:"success"});await queryClient.invalidateQueries({queryKey:["topics"]})}catch(value){if(/auth|session/i.test((value as Error).message))router.push("/login");else setFeedback({slug:topic.slug,message:(value as Error).message,tone:"error"})}finally{setBusyTopic("");releaseActionFocus()}}

  return <div className="space-y-16 sm:space-y-20">
    <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50 to-orange-50 px-6 py-10 sm:px-10 sm:py-14 dark:border-indigo-900 dark:from-slate-900 dark:via-indigo-950/70 dark:to-orange-950/30">
      <div className="relative z-10 max-w-3xl"><div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300"><Compass size={18}/><span className="eyebrow">Discover what works</span></div><h1 className="display mt-5">Ideas for every part of life.</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">Explore practical sets built around real outcomes—from weeknight cooking and travel to crafts, fitness, work, and whatever comes next.</p><Link href="/search" className="btn-primary mt-7"><Search size={18}/>Search any goal or item</Link></div>
      <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-gradient-to-br from-violet-400/25 to-orange-400/30 blur-3xl"/>
    </section>

    {error&&<div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{(error as Error).message}. Please try again shortly.</div>}
    {isLoading?<LoadingPanel title="Curating useful sets" detail="Ranking public sets by completeness, goal fit, and long-term usefulness…"/>:<div className="space-y-20">{(data?.sections??[]).map((section:any)=>section.sets.length>0&&<section key={section.key}><div className="mb-7 flex items-end justify-between gap-4"><div><p className="eyebrow">Curated collection</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em]">{section.title}</h2></div><span className="chip">{section.sets.length} sets</span></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{section.sets.map((set:any)=><SetCard key={set.id} set={set}/>)}</div></section>)}

      <section><div className="mb-7 max-w-2xl"><p className="eyebrow">Make discovery yours</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Follow the things you care about</h2><p className="mt-3 text-slate-500">Your interests help shape a more useful feed. Change them whenever you like.</p></div><div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{topics.data?.topics?.map((topic:any)=><div key={topic.id}><button disabled={Boolean(busyTopic)} onClick={()=>toggleTopic(topic)} className={`panel group flex w-full items-center gap-4 p-5 text-left disabled:opacity-60 ${topic.isFollowing?"!border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30":""}`}><span className={`grid size-12 shrink-0 place-items-center rounded-2xl transition ${topic.isFollowing?"bg-indigo-600 text-white":"bg-indigo-50 text-indigo-600 group-hover:rotate-3 dark:bg-indigo-950 dark:text-indigo-300"}`}>{topic.isFollowing?<Heart size={20} fill="currentColor"/>:<Tag size={20}/>}</span><span className="min-w-0 flex-1"><strong className="block"><ActionLabel busy={busyTopic===topic.slug} busyText={topic.isFollowing?"Unfollowing…":"Following…"}>{topic.name}</ActionLabel></strong><small className="mt-1 block line-clamp-2 leading-relaxed text-slate-500">{topic.description}</small><small className="mt-2 block font-bold text-indigo-600">{topic._count.follows} followers</small></span></button><InlineFeedback message={feedback?.slug===topic.slug?feedback?.message:undefined} tone={feedback?.tone}/></div>)}</div></section>

      <section><div className="mb-7 flex items-end justify-between"><div><p className="eyebrow">Begin with what you own</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Explore item worlds</h2></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{worlds.data?.worlds?.map((world:any)=><Link href={`/product-worlds/${world.slug}`} key={world.id} className="panel group flex items-center gap-4 p-5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 transition group-hover:rotate-3 dark:from-indigo-950 dark:to-violet-950 dark:text-indigo-300"><Globe2/></span><span className="min-w-0 flex-1"><strong className="block truncate">{world.title}</strong><small className="mt-1 block text-slate-500">{world.product.category.name} · {world.followers} following</small></span><ArrowRight className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" size={17}/></Link>)}</div></section>
    </div>}
  </div>;
}
