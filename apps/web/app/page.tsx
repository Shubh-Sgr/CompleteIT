import {ErrorPanel} from "@/components/page-state"; import Link from "@/lib/navigation";
import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ArrowRight,Camera,Check,CheckCircle2,HeartHandshake,PackageSearch,ShieldCheck,Sparkles,WandSparkles} from "lucide-react";
import {api} from "@/lib/api";
import {SetCard} from "@/components/set-card";
import {trackOnce} from "@/lib/analytics";

const lifeAreas=["Travel","Food","Fitness","Learning","Home","Creative work","Hobbies","Anything else"];
const benefits=[
  [PackageSearch,"See what you already have","Upload a photo or describe anything. You stay in control of every detected item."],
  [WandSparkles,"Reveal the useful gaps","AI understands your exact goal and finds what is genuinely missing—across any category."],
  [HeartHandshake,"Build with confidence","Compare practical paths, save privately, then improve your set with community insight."],
] as const;

export default function Home(){
  const {data,error,refetch}=useQuery({queryKey:["home-explore"],queryFn:()=>api<any>("/explore")});
  const [hasDraft,setHasDraft]=useState(false);
  useEffect(()=>{setHasDraft(Boolean(localStorage.getItem("completeit-guest-draft")));trackOnce("landing-view","landing_view")},[]);
  function discardDraft(){localStorage.removeItem("completeit-guest-draft");setHasDraft(false)}

  return <div className="space-y-20 pb-8 sm:space-y-28">
    <section className="hero-shell min-h-[36rem] px-6 py-12 text-white sm:px-12 sm:py-16 lg:grid lg:grid-cols-[1.12fr_.88fr] lg:items-center lg:px-16">
      <div className="relative z-10 max-w-3xl">

        <h1 className="hero-title mt-7 text-balance">Everything you need.<br/><span className="hero-emphasis">Nothing you don’t.</span></h1>
        <p className="mt-7 max-w-2xl text-base leading-relaxed text-indigo-100/80 sm:text-xl">Turn any photo, idea, item, or everyday goal into a clear, useful set. CompleteIt works across every part of life—not just one category.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/create" className="btn-primary btn-on-dark !min-h-14 !px-6 !text-base"><Camera size={20}/>{hasDraft?"Continue building":"Build my first set"}<ArrowRight size={18}/></Link>
          <Link href="/explore" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[.07] px-6 font-bold text-white backdrop-blur hover:bg-white/[.14]">Explore real sets <ArrowRight size={18}/></Link>
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-indigo-100/65"><ShieldCheck size={16}/>Free to start · Private by default · Built for any goal</p>
      </div>
      <div className="relative hidden h-full min-h-[30rem] lg:block" aria-hidden>
        <div className="hero-orbit right-2 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2"/>
        <div className="hero-orbit right-12 top-1/2 h-[17rem] w-[17rem] -translate-y-1/2 [animation-delay:-2s]"/>
        <div className="absolute right-24 top-1/2 grid size-32 -translate-y-1/2 place-items-center rounded-[2.2rem] border border-white/25 bg-white/15 shadow-2xl backdrop-blur-xl"><Sparkles size={52}/></div>
        <div className="hero-float-card right-0 top-16"><span className="grid size-8 place-items-center rounded-lg bg-emerald-400/25 text-emerald-200"><Check size={17}/></span>3 items already covered</div>
        <div className="hero-float-card bottom-20 right-6 [animation-delay:-3s]"><span className="grid size-8 place-items-center rounded-lg bg-orange-400/25 text-orange-200">+</span>2 useful additions found</div>
        <div className="hero-float-card left-2 top-36 [animation-delay:-1s]"><span className="grid size-8 place-items-center rounded-lg bg-violet-400/25">✦</span>Goal understood</div>
      </div>
    </section>

    {hasDraft&&<section className="panel relative overflow-hidden border-indigo-200 p-5 sm:flex sm:items-center sm:justify-between sm:p-6 dark:border-indigo-800"><div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-500"/><div><h2 className="mt-2 text-xl font-black tracking-tight">Your unfinished set is saved on this device</h2><p className="mt-1 text-sm text-slate-500">Every item, goal and choice is ready when you are.</p></div><div className="mt-5 flex flex-wrap gap-2 sm:mt-0"><button type="button" onClick={discardDraft} className="btn-secondary">Discard draft</button><Link className="btn-primary" href="/create">Continue set <ArrowRight size={17}/></Link></div></section>}

    <section>
      <div className="mx-auto max-w-3xl text-center"><h2 className="mt-4 text-4xl font-black tracking-[-.03em] sm:text-5xl">One simple flow. Any kind of goal.</h2><p className="mt-5 text-lg leading-relaxed text-slate-500">No rigid templates and no category limits. Start wherever you are.</p></div>
      <div className="mt-10 flex flex-wrap justify-center gap-2">{lifeAreas.map(area=><span className="chip !px-4 !py-2" key={area}>{area}</span>)}</div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{benefits.map(([Icon,title,body],index)=><article className="panel group relative overflow-hidden p-7 sm:p-8" key={title}><span className="step-number">0{index+1}</span><span className="mt-8 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:rotate-3 group-hover:scale-105 dark:bg-indigo-950 dark:text-indigo-300"><Icon size={23}/></span><h3 className="mt-5 text-xl font-black tracking-tight">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{body}</p></article>)}</div>
    </section>

    <section>
      <div className="mb-8 flex items-end justify-between gap-4"><div><h2 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">Sets worth borrowing</h2><p className="mt-3 max-w-xl text-slate-500">See how other people combine what they own into something genuinely useful.</p></div><Link href="/explore" className="btn-secondary hidden sm:inline-flex">Discover all <ArrowRight size={17}/></Link></div>
      {error?<ErrorPanel error={error} onRetry={refetch}/>:<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data?.sets?.slice(0,6).map((set:any)=><SetCard key={set.id} set={set}/>)??[1,2,3].map(value=><div key={value} className="skeleton h-[22rem]"/>)}</div>}
      <Link href="/explore" className="btn-secondary mt-6 w-full sm:hidden">Discover all <ArrowRight size={17}/></Link>
    </section>

    <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-8 sm:p-12 dark:border-indigo-900 dark:from-indigo-950/70 dark:via-slate-900 dark:to-orange-950/40"><div className="relative z-10 max-w-2xl"><h2 className="mt-4 text-4xl font-black tracking-[-.03em]">Stop guessing what belongs together.</h2><p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">CompleteIt keeps the goal visible, makes trade-offs clear, and lets your set improve over time.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{["Your own title and outcome","Owned and planned items","Transparent comparison paths","Ratings tied to real usage"].map(value=><p className="flex items-center gap-2 text-sm font-bold" key={value}><CheckCircle2 className="text-emerald-500" size={18}/>{value}</p>)}</div><Link href="/create" className="btn-primary mt-8">Start with anything <ArrowRight size={17}/></Link></div><div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-gradient-to-br from-indigo-300/50 to-orange-300/50 blur-3xl"/></section>

    <p className="text-center text-xs font-semibold text-slate-400">Demo product information is clearly labelled. Live merchant data is not connected.</p>
  </div>;
}
