"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {Bell,Compass,Home,Layers3,LogIn,LogOut,Moon,Plus,Search,Sun,User} from "lucide-react";
import {useTheme} from "next-themes";
import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ActionLabel,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

const primaryLinks=[["/",Home,"Home"],["/explore",Compass,"Explore"],["/create",Plus,"Create"],["/my-sets",Layers3,"My Sets"]] as const;

export function Nav(){
  const path=usePathname(),router=useRouter(),{resolvedTheme,setTheme}=useTheme();
  const [mounted,setMounted]=useState(false),[user,setUser]=useState<{username:string}|null>(null),[loggingOut,setLoggingOut]=useState(false);
  const {data:notificationSummary}=useQuery({queryKey:["notification-summary"],queryFn:()=>api<any>("/notifications"),enabled:Boolean(user),retry:false,refetchInterval:30_000});
  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{let active=true;api<any>("/auth/me").then(value=>active&&setUser(value.user)).catch(()=>active&&setUser(null));return()=>{active=false}},[path]);
  async function logout(){setLoggingOut(true);try{await api("/auth/logout",{method:"POST"})}finally{setUser(null);setLoggingOut(false);releaseActionFocus();router.push("/login");router.refresh()}}
  const accountLink=[user?`/users/${user.username}`:"/login",user?User:LogIn,user?"Profile":"Log in"] as const;
  const unreadCount=notificationSummary?.unreadCount??0;
  const isActive=(href:string)=>href==="/"?path===href:path===href||path.startsWith(`${href}/`);
  return <>
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0e111a]/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">C</span><span className="hidden xs:inline sm:inline">Complete<span className="text-indigo-600">It</span></span></Link>
        <nav aria-label="Primary navigation" className="ml-5 hidden items-center gap-1 md:flex">{primaryLinks.map(([href,_Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${isActive(href)?"bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200":"text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</Link>)}{user&&<Link aria-current={path.startsWith("/users/")?"page":undefined} href={`/users/${user.username}`} className={`rounded-lg px-3 py-2 text-sm font-semibold ${path.startsWith("/users/")?"bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200":"text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>Profile</Link>}</nav>
        <div className="ml-auto flex items-center gap-1">
          <Link aria-label="Search" href="/search" className="hidden rounded-lg p-2 hover:bg-slate-100 sm:inline-flex dark:hover:bg-slate-800"><Search size={19}/></Link>
          {user&&<Link aria-label={`Notifications${unreadCount?` (${unreadCount} unread)`:""}`} href="/notifications" className="relative hidden rounded-lg p-2 hover:bg-slate-100 sm:inline-flex dark:hover:bg-slate-800"><Bell size={19}/>{unreadCount>0&&<span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">{unreadCount>99?"99+":unreadCount}</span>}</Link>}
          <button aria-label="Toggle theme" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">{mounted&&resolvedTheme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>
          {user?<button type="button" disabled={loggingOut} onClick={logout} className="ml-1 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-red-950"><LogOut size={17}/><ActionLabel busy={loggingOut} busyText="Logging out…">Logout</ActionLabel></button>:<Link href="/login" className="ml-1 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white"><LogIn size={17}/>Login</Link>}
        </div>
      </div>
    </header>
    <nav aria-label="Mobile navigation" className={`fixed inset-x-0 bottom-0 z-40 grid ${user?"grid-cols-6":"grid-cols-5"} border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,.08)] md:hidden dark:border-slate-800 dark:bg-[#121620]`}>{[...primaryLinks,...(user?[["/notifications",Bell,"Inbox"] as const]:[]),accountLink].map(([href,Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold ${isActive(href)?"text-indigo-600":"text-slate-500"}`}><span className="relative"><Icon size={20}/>{href==="/notifications"&&unreadCount>0&&<span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-4 text-white">{unreadCount>99?"99+":unreadCount}</span>}</span>{label}{isActive(href)&&<span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-indigo-600"/>}</Link>)}</nav>
  </>
}
