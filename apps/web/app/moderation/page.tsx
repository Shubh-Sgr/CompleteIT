"use client";

import {useState} from "react";
import {ShieldCheck} from "lucide-react";
import {ActionLabel,ActivityIndicator,InlineFeedback,releaseActionFocus} from "@/components/action-feedback";
import {api} from "@/lib/api";

export default function Moderation(){
  const [reportId,setReportId]=useState(""),[reason,setReason]=useState("Reviewed against community rules"),[notice,setNotice]=useState(""),[tone,setTone]=useState<"success"|"error">("success"),[busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setNotice("");try{await api("/moderation/actions",{method:"POST",body:JSON.stringify({reportId:reportId||undefined,action:"REVIEWED",reason})});setTone("success");setNotice("Audit action recorded.")}catch(value){setTone("error");setNotice((value as Error).message)}finally{setBusy(false);releaseActionFocus()}}
  return <div className="mx-auto max-w-2xl"><ShieldCheck size={36} className="text-indigo-600"/><p className="eyebrow mt-5">Demo moderator tools</p><h1 className="display mt-3">Moderation audit</h1><p className="mt-4 text-slate-500">Every action creates an immutable audit row with moderator, report, reason and timestamp. Use the seeded admin account.</p><form className="panel mt-8 space-y-4 p-6" onSubmit={submit}><label className="block"><span className="mb-1 block text-sm font-bold">Report ID</span><input className="field" value={reportId} onChange={event=>setReportId(event.target.value)} placeholder="Optional local report ID"/></label><label className="block"><span className="mb-1 block text-sm font-bold">Reason</span><textarea className="field" value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white disabled:opacity-60"><ActionLabel busy={busy} busyText="Recording…">Record review</ActionLabel></button>{busy&&<ActivityIndicator title="Recording the audit action" steps={["Validating the moderation details…","Writing an immutable audit row…"]}/>}<InlineFeedback message={notice} tone={tone}/></form></div>;
}
