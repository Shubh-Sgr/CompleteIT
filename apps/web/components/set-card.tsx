import Link from "next/link";
import {ArrowUpRight,CheckCircle2,IndianRupee,Star,Users} from "lucide-react";
import {money} from "@/lib/api";

const themes=[
  {pattern:/cook|food|tea|snack|kitchen|grocery/i,emoji:"🥗",className:"set-theme-coral"},
  {pattern:/fitness|yoga|sport|cycle|health|gym/i,emoji:"⚡",className:"set-theme-lime"},
  {pattern:/travel|camp|road|carry|trip/i,emoji:"🧭",className:"set-theme-sky"},
  {pattern:/photo|camera|creative|craft|art/i,emoji:"✦",className:"set-theme-violet"},
  {pattern:/garden|plant|balcony|outdoor/i,emoji:"🌿",className:"set-theme-green"},
  {pattern:/study|work|desk|computer|gaming|tech/i,emoji:"⌘",className:"set-theme-blue"},
];

function visualFor(set:any){const haystack=[set.title,set.outcome,set.description,set.items?.[0]?.product?.category?.name].filter(Boolean).join(" ");return themes.find(theme=>theme.pattern.test(haystack))??{emoji:"◈",className:"set-theme-sunset"}}

export function SetCard({set}:{set:any}){
  const visual=visualFor(set),rating=Number(set.communityRating??0),followers=set._count?.followers;
  return <Link href={`/sets/${set.slug}`} className="set-card group">
    <div className={`set-card-visual ${visual.className}`}>
      <div className="set-card-grid" aria-hidden/>
      <span className="set-card-type">{set.setType?.toLowerCase().replaceAll("_"," ")??"community"}</span>
      <span className="set-card-symbol" aria-hidden>{visual.emoji}</span>
      <span className="set-card-open" aria-hidden><ArrowUpRight size={18}/></span>
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <h3 className="text-lg font-black leading-snug tracking-[-.02em] transition-colors group-hover:text-indigo-600 dark:group-hover:text-violet-300">{set.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{set.description}</p>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-5 text-xs font-bold text-slate-600 dark:border-white/[.07] dark:text-slate-300">
        <span className="flex items-center gap-1.5"><IndianRupee size={14}/>{money(set.totalPrice??set.budget)}</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="text-emerald-500" size={14}/>{Math.round(set.slotScore??0)}%</span>
        <span className="flex items-center gap-1.5"><Star className="text-amber-500" fill="currentColor" size={14}/>{rating.toFixed(1)}</span>
        {followers!==undefined&&<span className="flex items-center gap-1.5"><Users size={14}/>{followers}</span>}
      </div>
    </div>
  </Link>;
}
