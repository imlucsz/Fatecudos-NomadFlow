"use client";

import { ArrowUp, Plane, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RecordedTravelRequest, type VoicePhase } from "./recorded-travel-request";

export function TravelComposer({onSend,placeholder,sendLabel,onTextAccess,onVoiceBusy,hideAttachment=false,children}: {
  onSend:(message:string)=>void|false;placeholder:string;sendLabel:string;onTextAccess?:(message:string)=>void;
  onVoiceBusy?:(busy:boolean)=>void;hideAttachment?:boolean;children?:ReactNode;
}) {
  const [message,setMessage] = useState("");
  const [feedback,setFeedback] = useState("");
  const [voicePhase,setVoicePhase] = useState<VoicePhase>("idle");
  const [voicePreview,setVoicePreview] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLTextAreaElement>(null);
  const recording=voicePhase!=="idle";
  const display=[message.trim(),voicePreview].filter(Boolean).join(" ").slice(0,1200);

  useEffect(()=>{
    if (voicePreview && preview.current) preview.current.scrollTop=preview.current.scrollHeight;
  },[voicePreview]);

  function send(text:string) {
    setMessage(onSend(text)===false ? text : "");
    setFeedback("");
  }

  return <>
    <form className="composer-input" onSubmit={(event)=>{
      event.preventDefault();
      if (!recording) send(message.trim());
    }}>
      {!hideAttachment && <>
        <button type="button" className="composer-add" aria-label="Anexar notas de viagem" disabled={recording}
          onClick={()=>onTextAccess ? onTextAccess(message.trim()) : file.current?.click()}><Plus size={25} strokeWidth={1.5}/></button>
        {!onTextAccess && <input type="file" accept=".txt,text/plain" ref={file} hidden onChange={async (event)=>{
          const input=event.currentTarget;
          const attachment=input.files?.[0];
          if (!attachment) return;
          input.value="";
          if (attachment.size>50000) {setFeedback("Escolha um arquivo de texto de até 50 KB.");return;}
          try {setMessage((await attachment.text()).slice(0,1200));setFeedback("Notas adicionadas à mensagem.");}
          catch {setFeedback("O arquivo não pôde ser lido.");}
        }}/>}
      </>}
      {recording ? <textarea ref={preview} className="composer-live" value={display} readOnly rows={2} placeholder="Pedido por voz" aria-label="Descreva sua viagem"/>
        : onTextAccess ? <button type="button" className="composer-locked-field" aria-label="Descreva sua viagem" aria-haspopup="dialog"
          onClick={()=>onTextAccess(message.trim())}><span>{message || placeholder}</span></button>
          : <input value={message} onChange={(event)=>setMessage(event.target.value)} maxLength={1200} placeholder={placeholder} aria-label="Descreva sua viagem"/>}
      <RecordedTravelRequest phase={voicePhase} onPreview={setVoicePreview} onStatus={setFeedback}
        onDraft={(text)=>setMessage((draft)=>[draft.trim(),text].filter(Boolean).join(" ").slice(0,1200))}
        onPhase={(next)=>{setVoicePhase(next);onVoiceBusy?.(next!=="idle");}}
        onTranscript={(text)=>send([message.trim(),text].filter(Boolean).join(" ").slice(0,1200))}/>
      {!recording && <button type="submit" className="composer-circle composer-send" aria-label={sendLabel}><ArrowUp size={23} strokeWidth={1.65}/></button>}
    </form>
    {!recording && children}
    {voicePhase==="working" ? <div className="composer-flight" role="status">
      <span className="composer-flight-track" aria-hidden="true"><Plane size={15}/></span>
      <span>{feedback || "Preparando seu pedido…"}</span>
    </div> : feedback && <p className="composer-feedback" role="status">{feedback}</p>}
  </>;
}
