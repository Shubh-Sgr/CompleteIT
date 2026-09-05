"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {ActionLabel,ActivityIndicator,InlineFeedback,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{await api("/auth/login",{method:"POST",body:JSON.stringify({email,password})});router.push("/my-sets")}catch(value){setError((value as Error).message)}finally{setBusy(false);releaseActionFocus()}}
  return <div className="mx-auto max-w-md panel p-6 sm:p-8"><p className="eyebrow">Welcome back</p><h1 className="mt-2 text-3xl font-black">Log in to CompleteIt</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-bold">Email</span><input required autoComplete="email" placeholder="you@example.com" className="field" type="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label className="block"><span className="mb-1.5 block text-sm font-bold">Password</span><input required autoComplete="current-password" placeholder="Enter your password" className="field" type="password" value={password} onChange={event=>setPassword(event.target.value)}/></label><button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-60"><ActionLabel busy={busy} busyText="Logging in…">Log in</ActionLabel></button>{busy&&<ActivityIndicator title="Signing you in" steps={["Checking your details…","Loading your private sets…"]}/>}<InlineFeedback message={error} tone="error"/></form><p className="mt-5 text-center text-sm text-slate-500">New here? <Link className="link" href="/register">Create an account</Link></p></div>;
}
