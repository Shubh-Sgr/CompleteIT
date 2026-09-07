"use client";

import {API} from "./api";

export type ProductEvent="landing_view"|"create_started"|"input_submitted"|"ai_result"|"recommendation_selected"|"set_saved"|"share_clicked"|"item_progress_changed"|"search_submitted";

function anonymousId(){
  let id=localStorage.getItem("completeit-anonymous-id");
  if(!id){id=crypto.randomUUID();localStorage.setItem("completeit-anonymous-id",id)}
  return id;
}

export function track(event:ProductEvent,properties:Record<string,string|number|boolean|null>={}){
  if(typeof window==="undefined")return;
  const body=JSON.stringify({event,anonymousId:anonymousId(),path:location.pathname,properties});
  void fetch(`${API}/analytics/events`,{method:"POST",credentials:"include",keepalive:true,headers:{"Content-Type":"application/json"},body}).catch(()=>undefined);
}

export function trackOnce(key:string,event:ProductEvent,properties:Record<string,string|number|boolean|null>={}){
  if(typeof window==="undefined"||sessionStorage.getItem(`completeit-event-${key}`))return;
  sessionStorage.setItem(`completeit-event-${key}`,"1");
  track(event,properties);
}
