"use client";

import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Heart} from "lucide-react";
import {ActionLabel,InlineFeedback,LoadingPanel,releaseActionFocus} from "@/components/action-feedback";
import {api,money} from "@/lib/api";

export default function Product(){
  const {id}=useParams<{id:string}>(),router=useRouter(),queryClient=useQueryClient();
  const [notice,setNotice]=useState(""),[tone,setTone]=useState<"success"|"error">("success"),[busy,setBusy]=useState(false);
  const {data}=useQuery({queryKey:["product",id],queryFn:()=>api<any>(`/products/${id}`)});const product=data?.product;
  if(!product)return <LoadingPanel title="Loading this item" detail="Collecting its details, sets, and follow status…"/>;
  async function toggle(){setBusy(true);setNotice("");try{await api(`/products/${id}/follow`,{method:data.viewer.isFollowing?"DELETE":"POST"});setTone("success");setNotice(data.viewer.isFollowing?"Product unfollowed.":"Product followed.");await queryClient.invalidateQueries({queryKey:["product",id]})}catch(value){if(/auth|session/i.test((value as Error).message))router.push("/login");else{setTone("error");setNotice((value as Error).message)}}finally{setBusy(false);releaseActionFocus()}}
  return <div className="mx-auto max-w-4xl"><div className="panel grid overflow-hidden md:grid-cols-2"><div className="grid min-h-72 place-items-center bg-gradient-to-br from-indigo-100 to-amber-100 text-7xl dark:from-indigo-950 dark:to-amber-950">📦</div><div className="p-8"><p className="eyebrow">{product.category.name} · Demo product</p><h1 className="mt-3 text-4xl font-black">{product.name}</h1><p className="mt-2 text-slate-500">{product.brand}</p><p className="mt-6 text-3xl font-black">{money(product.price)}</p><p className="mt-5 leading-relaxed text-slate-500">{product.description}</p><div className="mt-7 flex flex-wrap gap-2"><Link href={`/create?anchor=${product.id}`} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">Build a set from this anchor</Link><button disabled={busy} onClick={toggle} className="flex items-center gap-2 rounded-xl border px-4 py-3 font-bold disabled:opacity-60"><Heart size={18} fill={data.viewer.isFollowing?"currentColor":"none"}/><ActionLabel busy={busy} busyText={data.viewer.isFollowing?"Unfollowing…":"Following…"}>{data.viewer.isFollowing?"Unfollow":"Follow"} · {product._count.follows}</ActionLabel></button></div><InlineFeedback message={notice} tone={tone}/>{product.worlds.length>0&&<Link className="link mt-5 inline-block" href={`/product-worlds/${product.worlds[0].slug}`}>Open {product.worlds[0].title}</Link>}</div></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-900">Demo product information — live merchant data is not connected.</p></div>;
}
