"use client";

import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {Bell,Compass,Home,Layers3,LogIn,LogOut,Moon,Plus,Search,Sun,User} from "lucide-react";
import {useTheme} from "next-themes";
import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {ActionLabel,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

const primaryLinks=[["/",Home,"Home"],["/explore",Compass,"Discover"],["/create",Plus,"Create"],["/my-sets",Layers3,"My Sets"]] as const;

export function Nav(){
  const path=usePathname(),router=useRouter(),{resolvedTheme,setTheme}=useTheme();
  const [mounted,setMounted]=useState(false),[user,setUser]=useState<{username:string}|null>(null),[loggingOut,setLoggingOut]=useState(false);
  const {data:notificationSummary}=useQuery({queryKey:["notification-summary"],queryFn:()=>api<any>("/notifications"),enabled:Boolean(user),retry:false,refetchInterval:30_000});
  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{let active=true;api<any>("/auth/me").then(value=>active&&setUser(value.user)).catch(()=>active&&setUser(null));return()=>{active=false}},[path]);
  async function logout(){setLoggingOut(true);try{await api("/auth/logout",{method:"POST"})}finally{setUser(null);setLoggingOut(false);releaseActionFocus();router.push("/login");router.refresh()}}
  const unreadCount=notificationSummary?.unreadCount??0;
  const isActive=(href:string)=>href==="/"?path===href:path===href||path.startsWith(`${href}/`);
  const mobileLinks=[...primaryLinks,...(user?[["/notifications",Bell,"Inbox"] as const]:[]),[user?`/users/${user.username}`:"/login",user?User:LogIn,user?"Profile":"Log in"] as const];

  return <>
    <header className="nav-shell sticky top-0 z-40">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="CompleteIt home" className="group flex shrink-0 items-center gap-2.5">
          <span className="brand-mark"><span>C</span><i aria-hidden/></span>
          <span className="hidden text-xl font-black tracking-[-.04em] xs:inline sm:inline">Complete<span className="brand-text">It</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="ml-3 hidden items-center gap-1 rounded-2xl bg-slate-100/70 p-1 md:flex dark:bg-white/[.05]">
          {primaryLinks.map(([href,Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`nav-link ${isActive(href)?"nav-link-active":""}`}><Icon size={16}/>{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link aria-label="Search anything" href="/search" className="icon-button hidden sm:grid"><Search size={19}/></Link>
          {user&&<Link aria-label={`Notifications${unreadCount?` (${unreadCount} unread)`:""}`} href="/notifications" className="icon-button relative hidden sm:grid"><Bell size={19}/>{unreadCount>0&&<span className="notification-badge">{unreadCount>99?"99+":unreadCount}</span>}</Link>}
          <button type="button" aria-label="Toggle color theme" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")} className="icon-button">{mounted&&resolvedTheme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>
          {user?<button type="button" disabled={loggingOut} onClick={logout} className="btn-secondary ml-1 !min-h-10 !px-3 text-sm"><LogOut size={17}/><span className="hidden sm:inline"><ActionLabel busy={loggingOut} busyText="Leaving…">Logout</ActionLabel></span></button>:<Link href="/login" className="btn-primary ml-1 !min-h-10 !px-4 text-sm"><LogIn size={17}/>Login</Link>}
        </div>
      </div>
    </header>
    <nav aria-label="Mobile navigation" className={`mobile-dock grid ${user?"grid-cols-6":"grid-cols-5"} md:hidden`}>
      {mobileLinks.map(([href,Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`mobile-dock-link ${isActive(href)?"mobile-dock-active":""}`}><span className="relative"><Icon size={20}/>{href==="/notifications"&&unreadCount>0&&<span className="notification-badge !-right-2 !-top-2 !min-w-4 !text-[9px] !leading-4">{unreadCount>99?"99+":unreadCount}</span>}</span><span>{label}</span></Link>)}
    </nav>
  </>;
}
