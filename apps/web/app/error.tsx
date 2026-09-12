import {useEffect} from "react";
import {CircleAlert,RefreshCw} from "lucide-react";

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>console.error(error),[error]);return <div className="empty-state mx-auto max-w-xl"><CircleAlert className="mx-auto text-red-500" size={38}/><h1 className="mt-4 text-2xl font-black">Something did not load</h1><p className="mt-2 text-sm text-slate-500">Your work is still safe. Try this page again; if the problem continues, return home and reopen it.</p><button type="button" onClick={reset} className="btn-primary mt-6"><RefreshCw size={17}/>Try again</button></div>}
