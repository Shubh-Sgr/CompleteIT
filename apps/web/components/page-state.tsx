import Link from "@/lib/navigation";
import {CircleAlert,LogIn,RefreshCw} from "lucide-react";

export function ErrorPanel({error,onRetry,title="This page couldn’t load",headingLevel=2}:{error:unknown;onRetry:()=>unknown;title?:string;headingLevel?:1|2}) {
  const status=(error as {status?:number})?.status;
  const auth=status===401;
  const Heading=headingLevel===1?"h1":"h2";
  return <section className="empty-state state-panel" aria-label="Page recovery">
    {auth?<LogIn aria-hidden="true" className="mx-auto text-indigo-600 dark:text-indigo-300" size={28}/>:<CircleAlert aria-hidden="true" className="mx-auto text-red-600 dark:text-red-300" size={28}/>}
    <Heading className="mt-4 text-xl font-bold">{auth?"Log in to continue":status===404?"This page isn’t available":title}</Heading>
    <p role="alert" className="mt-3 text-sm text-slate-500">{auth?"Your private sets and activity are available after you sign in.":status===403?"You don’t have access to this content. Explore public sets or contact the owner.":status===404?"This may be private, removed, or unavailable. You can try again or explore other sets.":"We couldn’t get the latest information. Check your connection and try again."}</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3">{auth?<Link href="/login" className="btn-primary">Log in</Link>:<button type="button" onClick={()=>onRetry()} className="btn-primary"><RefreshCw aria-hidden="true" size={16}/>Try again</button>}<Link href="/explore" className="btn-secondary">Explore sets</Link></div>
  </section>;
}
