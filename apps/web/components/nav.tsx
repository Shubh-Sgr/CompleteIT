import Link from "@/lib/navigation";
import {usePathname,useRouter} from "@/lib/navigation";
import {Bell,ChevronDown,Compass,Heart,Home,Layers3,LogIn,LogOut,Moon,Plus,Search,Settings,Sun,User} from "lucide-react";
import {useTheme} from "next-themes";
import {useEffect,useRef,useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {ActionLabel,InlineFeedback,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

const primaryLinks=[["/",Home,"Home"],["/explore",Compass,"Discover"],["/create",Plus,"Create"],["/my-sets",Layers3,"My Sets"]] as const;

export function Nav(){
  const path=usePathname(),router=useRouter(),queryClient=useQueryClient(),{resolvedTheme,setTheme}=useTheme();
  const [mounted,setMounted]=useState(false),[user,setUser]=useState<{username:string}|null>(null),[loggingOut,setLoggingOut]=useState(false);
  const {data:notificationSummary}=useQuery({queryKey:["notification-summary"],queryFn:()=>api<any>("/notifications"),enabled:Boolean(user),retry:false,refetchInterval:30_000});
  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{let active=true;api<any>("/auth/me").then(value=>active&&setUser(value.user)).catch(()=>active&&setUser(null));return()=>{active=false}},[path]);
  async function logout(){setLoggingOut(true);setLogoutError("");try{await api("/auth/logout",{method:"POST"});setUser(null);queryClient.clear();router.push("/login")}catch(error){setLogoutError((error as Error).message)}finally{setLoggingOut(false);releaseActionFocus()}}
  const accountMenu=useRef<HTMLDetailsElement>(null),[logoutError,setLogoutError]=useState("");
  useEffect(()=>{if(accountMenu.current)accountMenu.current.open=false},[path]);
  useEffect(()=>{function close(event:PointerEvent){if(accountMenu.current&&!accountMenu.current.contains(event.target as Node))accountMenu.current.open=false}function escape(event:KeyboardEvent){if(event.key==="Escape"&&accountMenu.current?.open){accountMenu.current.open=false;accountMenu.current.querySelector("summary")?.focus()}}document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape)}},[]);
  const unreadCount=notificationSummary?.unreadCount??0;
  const isActive=(href:string)=>href==="/"?path===href:path===href||path.startsWith(`${href}/`);
  const mobileLinks=[...primaryLinks,...(user?[["/notifications",Bell,"Inbox"] as const]:[]),[user?`/users/${user.username}`:"/login",user?User:LogIn,user?"Profile":"Log in"] as const];

  return <>
    <header className="nav-shell sticky top-0 z-40">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="CompleteIt home" className="group flex shrink-0 items-center gap-2.5">
          <span className="brand-mark"><span>C</span><i aria-hidden/></span>
          <span className="hidden text-xl font-black tracking-[-.04em] xs:inline sm:inline">Complete<span className="brand-text">It</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="ml-3 hidden items-center gap-1 rounded-2xl bg-slate-100/70 p-1 lg:flex dark:bg-white/[.05]">
          {primaryLinks.map(([href,Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`nav-link ${isActive(href)?"nav-link-active":""}`}><Icon size={16}/>{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link aria-label="Search anything" href="/search" className="icon-button"><Search size={19}/></Link>
          {user&&<Link aria-label={`Notifications${unreadCount?` (${unreadCount} unread)`:""}`} href="/notifications" className="icon-button desktop-notifications relative"><Bell size={19}/>{unreadCount>0&&<span className="notification-badge">{unreadCount>99?"99+":unreadCount}</span>}</Link>}
          <button type="button" aria-label="Toggle color theme" onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")} className="icon-button">{mounted&&resolvedTheme==="dark"?<Sun size={19}/>:<Moon size={19}/>}</button>
          {user?<details ref={accountMenu} className="account-menu group relative ml-1">
            <summary aria-label="Open account menu" className="btn-secondary !min-h-10 cursor-pointer list-none !gap-2 !px-2.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-xs font-black text-white">{user.username[0]?.toUpperCase()}</span>
              <span className="hidden max-w-28 truncate font-black lg:inline">Profile</span>
              <ChevronDown className="hidden transition group-open:rotate-180 sm:block" size={14}/>
            </summary>
            <div className="absolute right-0 top-[calc(100%+.65rem)] z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800"><p className="truncate text-sm font-black">@{user.username}</p><p className="mt-0.5 text-xs text-slate-500">Your CompleteIt account</p></div>
              <Link href={`/users/${user.username}`} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"><User size={17}/>View profile</Link>
              <Link href="/following" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"><Heart size={17}/>Following activity</Link>
              <Link href="/notifications" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"><Bell size={17}/>Notifications{unreadCount>0&&<span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">{unreadCount>99?"99+":unreadCount}</span>}</Link>
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"><Settings size={17}/>Settings</Link>
              <button type="button" disabled={loggingOut} onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/40"><LogOut size={17}/><ActionLabel busy={loggingOut} busyText="Logging out…">Logout</ActionLabel></button>
              <InlineFeedback message={logoutError} tone="error"/>
            </div>
          </details>:<Link href="/login" className="btn-primary ml-1 !min-h-10 !px-4 text-sm"><LogIn size={17}/>Login</Link>}
        </div>
      </div>
    </header>
    <nav aria-label="Mobile navigation" className={`mobile-dock grid ${user?"grid-cols-6":"grid-cols-5"} lg:hidden`}>
      {mobileLinks.map(([href,Icon,label])=><Link aria-current={isActive(href)?"page":undefined} key={href} href={href} className={`mobile-dock-link ${isActive(href)?"mobile-dock-active":""}`}><span className="relative"><Icon size={20}/>{href==="/notifications"&&unreadCount>0&&<span className="notification-badge !-right-2 !-top-2 !min-w-4 !text-xs !leading-4">{unreadCount>99?"99+":unreadCount}</span>}</span><span>{label}</span></Link>)}
    </nav>
  </>;
}
