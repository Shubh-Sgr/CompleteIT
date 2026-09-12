import Link from "@/lib/navigation";
import {ArrowUpRight,Activity,Compass,Layers3,Leaf,Monitor,Palette,Utensils} from "lucide-react";
import {money} from "@/lib/api";

const themes=[
  {pattern:/cook|food|tea|snack|kitchen|grocery/i,icon:Utensils,className:"set-theme-coral"},
  {pattern:/fitness|yoga|sport|cycle|health|gym/i,icon:Activity,className:"set-theme-lime"},
  {pattern:/travel|camp|road|carry|trip/i,icon:Compass,className:"set-theme-sky"},
  {pattern:/photo|camera|creative|craft|art/i,icon:Palette,className:"set-theme-violet"},
  {pattern:/garden|plant|balcony|outdoor/i,icon:Leaf,className:"set-theme-green"},
  {pattern:/study|work|desk|computer|gaming|tech/i,icon:Monitor,className:"set-theme-blue"},
];

function visualFor(set:any){const haystack=[set.title,set.outcome,set.description,set.items?.[0]?.product?.category?.name].filter(Boolean).join(" ");return themes.find(theme=>theme.pattern.test(haystack))??{icon:Layers3,className:"set-theme-sunset"}}

export function SetCard({set,meta}:{set:any;meta?:string}){
  const visual=visualFor(set),Icon=visual.icon,rating=Number(set.communityRating??0),followers=set._count?.followers;
  return <Link href={`/sets/${set.slug}`} className="set-card group">
    <div className={`set-card-visual ${visual.className}`}>

      <div className="set-card-badges"><span className="set-card-type">{set.setType?.toLowerCase().replaceAll("_"," ")??"community"}</span>{meta&&<span className="set-card-type">{meta}</span>}</div>
      <span className="set-card-symbol" aria-hidden><Icon size={24}/></span>
      <span className="set-card-open" aria-hidden><ArrowUpRight size={18}/></span>
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <h3 className="text-lg font-black leading-snug tracking-[-.02em] transition-colors group-hover:text-indigo-600 dark:group-hover:text-violet-300">{set.title}</h3>
      <p className="mb-5 mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{set.description}</p>
      <dl className="set-card-metrics mt-auto"><div><dt>Cost</dt><dd>{money(set.totalPrice??set.budget)}</dd></div><div><dt>Completion</dt><dd>{Math.round(set.slotScore??0)}%</dd></div><div><dt>Community rating</dt><dd>{rating.toFixed(1)}</dd></div>{followers!==undefined&&<div><dt>Followers</dt><dd>{followers}</dd></div>}</dl>
    </div>
  </Link>;
}
