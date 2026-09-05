"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {ChevronRight,Globe2,Heart,Tag} from "lucide-react";
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
  return <div><p className="eyebrow">Explore anything</p><h1 className="display mt-3">Useful combinations across everyday life.</h1><p className="mt-4 max-w-2xl text-slate-500">Cooking, cycling, travel, crafts, fitness, gardening, technology and more—ranked by goal fit, completeness and long-term usefulness.</p>{error&&<p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">{(error as Error).message}. Start the local API and load the demo data.</p>}<div className="mt-12 space-y-14">{isLoading?<LoadingPanel title="Finding useful sets" detail="Ranking public sets by completeness and long-term usefulness…"/>:(data?.sections??[]).map((section:any)=>section.sets.length>0&&<section key={section.key}><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">{section.title}</h2><ChevronRight className="text-slate-400"/></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{section.sets.map((set:any)=><SetCard key={set.id} set={set}/>)}</div></section>)}<section><div className="mb-5"><p className="eyebrow">Topics from many categories</p><h2 className="mt-2 text-2xl font-black">Follow what matters to you</h2></div><div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">{topics.data?.topics?.map((topic:any)=><div key={topic.id}><button disabled={Boolean(busyTopic)} onClick={()=>toggleTopic(topic)} className={`panel flex w-full items-center gap-4 p-4 text-left disabled:opacity-60 ${topic.isFollowing?"border-indigo-500":"hover:border-indigo-400"}`}><span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{topic.isFollowing?<Heart size={19} fill="currentColor"/>:<Tag size={19}/>}</span><span className="flex-1"><strong className="block text-sm"><ActionLabel busy={busyTopic===topic.slug} busyText={topic.isFollowing?"Unfollowing…":"Following…"}>{topic.name}</ActionLabel></strong><small className="text-slate-500">{topic.description} · {topic._count.follows} followers</small></span></button><InlineFeedback message={feedback?.slug===topic.slug?feedback?.message:undefined} tone={feedback?.tone}/></div>)}</div></section><section><div className="mb-5"><p className="eyebrow">Item worlds</p><h2 className="mt-2 text-2xl font-black">Start with any item you own</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{worlds.data?.worlds?.map((world:any)=><Link href={`/product-worlds/${world.slug}`} key={world.id} className="panel flex items-center gap-4 p-4 hover:border-indigo-400"><span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Globe2/></span><span><strong className="block text-sm">{world.title}</strong><small className="text-slate-500">{world.product.category.name} · {world.followers} followers</small></span></Link>)}</div></section></div></div>;
}
