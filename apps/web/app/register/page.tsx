"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {ActionLabel,ActivityIndicator,InlineFeedback,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

const fields=[["Display name","displayName","Your name","text"],["Username","username","choose-a-username","text"],["Email","email","you@example.com","email"],["Password","password","At least 8 characters","password"]] as const;

export default function Register(){
  const router=useRouter();
  const [migrate,setMigrate]=useState(false),[form,setForm]=useState({displayName:"",username:"",email:"",password:""}),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>setMigrate(new URLSearchParams(location.search).get("migrate")==="1"),[]);
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{const guestDraft=migrate?JSON.parse(localStorage.getItem("completeit-guest-draft")??"null"):undefined;await api("/auth/register",{method:"POST",body:JSON.stringify({...form,guestDraft})});localStorage.removeItem("completeit-guest-draft");router.push("/my-sets")}catch(value){setError((value as Error).message)}finally{setBusy(false);releaseActionFocus()}}
  return <div className="mx-auto max-w-md panel p-6 sm:p-8"><p className="eyebrow">Create account</p><h1 className="mt-2 text-3xl font-black">Keep your set</h1>{migrate&&<p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-100">Your temporary set will move into My Sets and remain private.</p>}<form className="mt-6 space-y-4" onSubmit={submit}>{fields.map(([label,key,placeholder,type])=><label className="block" key={key}><span className="mb-1.5 block text-sm font-bold">{label}</span><input required minLength={key==="password"?8:2} className="field" type={type} placeholder={placeholder} value={form[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/></label>)}<button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50"><ActionLabel busy={busy} busyText="Creating your account…">Create account & save</ActionLabel></button>{busy&&<ActivityIndicator title={migrate?"Creating your account and saving the set":"Creating your account"} steps={["Securing your details…",migrate?"Moving your private draft…":"Preparing your library…"]}/>}<InlineFeedback message={error} tone="error"/></form><p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link className="link" href="/login">Log in</Link></p></div>;
}
