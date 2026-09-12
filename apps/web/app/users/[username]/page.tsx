import {ErrorPanel} from "@/components/page-state"; import Link from "@/lib/navigation";
import {useParams,useRouter} from "@/lib/navigation";
import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {Heart,Settings} from "lucide-react";
import {ActionLabel,InlineFeedback,LoadingPanel,releaseActionFocus} from "@/components/action-feedback";
import {SetCard} from "@/components/set-card";
import {api} from "@/lib/api";

export default function Profile(){
  const {username}=useParams<{username:string}>(),router=useRouter(),queryClient=useQueryClient();
  const [notice,setNotice]=useState(""),[tone,setTone]=useState<"success"|"error">("success"),[busy,setBusy]=useState(false);
  const {data,isLoading,error,refetch}=useQuery({queryKey:["profile",username],queryFn:()=>api<any>(`/users/${username}`)});
  if(isLoading)return <LoadingPanel title="Loading this profile" detail="Collecting public sets and community activity…"/>;
  if(error||!data?.user)return <ErrorPanel error={error??{status:404}} onRetry={refetch} title="Profile unavailable" headingLevel={1}/>;
  const user=data.user,profile=user.profile??{displayName:user.username,bio:""};
  async function toggle(){setBusy(true);setNotice("");try{await api(`/users/${username}/follow`,{method:data.viewer.isFollowing?"DELETE":"POST"});setTone("success");setNotice(data.viewer.isFollowing?"User unfollowed.":"User followed.");await queryClient.invalidateQueries({queryKey:["profile",username]})}catch(value){if(/auth|session/i.test((value as Error).message))router.push("/login");else{setTone("error");setNotice((value as Error).message)}}finally{setBusy(false);releaseActionFocus()}}
  return <div><section className="panel p-7 sm:p-10"><div className="flex flex-wrap items-start gap-5"><span className="grid size-20 place-items-center rounded-3xl bg-indigo-100 text-3xl font-black text-indigo-700">{profile.displayName[0]?.toUpperCase()}</span><div className="min-w-0 flex-1"><h1 className="mt-2 text-3xl font-black">{profile.displayName}</h1><p className="text-sm text-slate-500">@{user.username}</p><p className="mt-3 text-slate-500">{profile.bio||"Useful collections, transparent trade-offs and notes from real use."}</p><div className="mt-4 flex flex-wrap gap-5 text-sm"><span><b>{user.sets.length}</b> public sets</span><span><b>{user._count.followers}</b> followers</span><span><b>{user._count.following}</b> following</span></div></div><div>{data.viewer.isOwner?<Link href="/settings" className="chip"><Settings size={15}/>Settings</Link>:<button disabled={busy} onClick={toggle} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold disabled:opacity-60 ${data.viewer.isFollowing?"border":"bg-indigo-600 text-white"}`}><Heart size={17} fill={data.viewer.isFollowing?"currentColor":"none"}/><ActionLabel busy={busy} busyText={data.viewer.isFollowing?"Unfollowing…":"Following…"}>{data.viewer.isFollowing?"Unfollow":"Follow"}</ActionLabel></button>}<InlineFeedback message={notice} tone={tone}/></div></div></section><div className="mt-8 grid gap-4 sm:grid-cols-4">{[["Followed topics",user._count.topicFollows],["Followed products",user._count.productFollows],["Helpful suggestions",user._count.suggestions],["Outcome updates",user._count.updates]].map(([label,count])=><div className="panel p-5" key={label}><b className="text-2xl">{count}</b><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}</div><section className="mt-10"><h2 className="mt-2 text-2xl font-black">Public sets</h2><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{user.sets.map((set:any)=><SetCard set={set} key={set.id}/>)}</div>{user.sets.length===0&&<p className="panel mt-5 p-6 text-sm text-slate-500">No public sets yet.</p>}</section></div>;
}
