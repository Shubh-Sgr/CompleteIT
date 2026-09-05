import Link from "next/link";
import {ArrowLeft,Compass} from "lucide-react";

export default function NotFound(){return <div className="empty-state mx-auto max-w-xl"><span className="text-5xl" aria-hidden>🧩</span><p className="eyebrow mt-5">404 · Missing piece</p><h1 className="mt-2 text-3xl font-black">We could not find that page</h1><p className="mt-3 text-slate-500">It may have moved, become private, or no longer exist.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link className="btn-secondary" href="/"><ArrowLeft size={17}/>Go home</Link><Link className="btn-primary" href="/explore"><Compass size={17}/>Explore sets</Link></div></div>}
