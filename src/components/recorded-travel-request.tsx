"use client";

import { Mic, Send, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { browserSpeechRecognition, type Recognition } from "@/lib/speech";

export type VoicePhase = "idle" | "opening" | "recording" | "working";
type Recording = {
  stream?:MediaStream;media?:MediaRecorder;preview?:Recognition;sendRequested?:boolean;listeners?:AbortController;
  browserText?:string;browserComplete?:boolean;completePreview?:(text:string)=>void;browserResult?:Promise<string>;
};
type Transcription = {phase:"loading"|"transcribing"|"error"} | {phase:"done";text:string};

function stopPreview(recording:Recording) {
  recording.completePreview?.("");
  const preview=recording.preview;
  if (!preview) return;
  recording.preview=undefined;
  preview.onresult=null;
  preview.onerror=null;
  preview.onend=null;
  try {if (preview.abort) preview.abort(); else preview.stop();} catch {}
}

function release(recording:Recording) {
  stopPreview(recording);
  recording.listeners?.abort();
  if (recording.media?.state==="recording") recording.media.stop();
  recording.stream?.getTracks().forEach((track)=>track.stop());
}

async function decodeSpeech(blob:Blob) {
  if (!blob.size) return null;
  const context=new OfflineAudioContext(1,16000,16000);
  const audio=await context.decodeAudioData(await blob.arrayBuffer());
  const samples=audio.getChannelData(0).slice();
  return samples.length>=3200 && samples.some((sample)=>Math.abs(sample)>.004) ? samples : null;
}

export function RecordedTravelRequest({phase,onPhase,onTranscript,onPreview,onDraft,onStatus}: {
  phase:VoicePhase;onPhase:(phase:VoicePhase)=>void;onTranscript:(text:string)=>void;onPreview:(text:string)=>void;
  onDraft:(text:string)=>void;onStatus:(status:string)=>void;
}) {
  const recording=useRef<Recording|null>(null);
  const worker=useRef<Worker|null>(null);
  const complete=useRef(onTranscript);

  useEffect(()=>{complete.current=onTranscript;},[onTranscript]);

  useEffect(()=>()=>{
    const current=recording.current;
    recording.current=null;
    if (current) release(current);
    worker.current?.terminate();
    worker.current=null;
  },[]);

  function finish(current:Recording,status="") {
    if (recording.current!==current) return;
    recording.current=null;
    release(current);
    onPhase("idle");
    onPreview("");
    onStatus(status);
  }

  function recover(current:Recording,status:string) {
    if (recording.current!==current) return;
    const draft=current.browserText;
    finish(current,draft ? "Revise o texto reconhecido e envie sua mensagem." : status);
    if (draft) onDraft(draft);
  }

  async function transcribe(current:Recording,blob:Blob) {
    try {
      const browserText=await current.browserResult;
      if (recording.current!==current) return;
      release(current);
      if (browserText) {
        finish(current);
        complete.current(browserText);
        return;
      }
      const samples=await decodeSpeech(blob);
      if (recording.current!==current) return;
      if (!samples) {recover(current,"Não consegui ouvir a gravação. Fale perto do microfone e tente de novo.");return;}
      const engine=worker.current ?? new Worker(new URL("../lib/voice-transcription.worker.ts",import.meta.url),{type:"module"});
      worker.current=engine;
      const listeners=new AbortController();
      current.listeners=listeners;
      const options={signal:listeners.signal};
      const fail=()=>{
        if (recording.current!==current) return;
        engine.terminate();
        worker.current=null;
        recover(current,"A transcrição ficou indisponível. Tente novamente ou escreva seu pedido.");
      };
      engine.addEventListener("error",fail,options);
      engine.addEventListener("messageerror",fail,options);
      engine.addEventListener("message",(event:MessageEvent<Transcription>)=>{
        if (recording.current!==current) return;
        const result=event.data;
        if (result.phase==="loading") onStatus("Preparando o reconhecimento de voz em português pela primeira vez.");
        if (result.phase==="transcribing") onStatus("");
        if (result.phase==="error") fail();
        if (result.phase==="done") {
          const text=result.text.trim().slice(0,1200);
          if (text) {
            finish(current);
            complete.current(text);
          } else recover(current,"Não consegui entender o áudio. Grave a frase de novo.");
        }
      },options);
      engine.postMessage(samples,[samples.buffer]);
    } catch {
      recover(current,"Não consegui transcrever o áudio. Tente novamente ou escreva seu pedido.");
    }
  }

  function previewSpeech(current:Recording,stream:MediaStream) {
    try {
      const preview=browserSpeechRecognition();
      if (!preview) {onStatus("Gravando áudio…");return;}
      current.preview=preview;
      preview.lang="pt-BR";
      preview.continuous=true;
      preview.interimResults=true;
      preview.onresult=(event)=>{
        if (recording.current!==current) return;
        const results=Array.from(event.results);
        current.browserText=results.map((result)=>result[0]?.transcript.trim() ?? "").filter(Boolean).join(" ").slice(0,1200);
        current.browserComplete=results.length>0 && results.every((result)=>result.isFinal);
        onPreview(current.browserText);
      };
      preview.onend=()=>{
        if (recording.current!==current) return;
        current.preview=undefined;
        current.completePreview?.(current.browserComplete ? current.browserText ?? "" : "");
      };
      preview.onerror=()=>{
        if (recording.current!==current) return;
        current.browserComplete=false;
        current.completePreview?.("");
        if (!current.sendRequested) onStatus("Gravando áudio…");
      };
      preview.start(stream.getAudioTracks()[0]);
    } catch {
      stopPreview(current);
      onStatus("Gravando áudio…");
    }
  }

  async function start() {
    if (recording.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined") {
      onStatus("O microfone não está disponível neste navegador. Você pode escrever seu pedido.");
      return;
    }
    const current:Recording={};
    recording.current=current;
    onPhase("opening");
    onStatus("Abrindo o microfone…");
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      if (recording.current!==current) {stream.getTracks().forEach((track)=>track.stop());return;}
      current.stream=stream;
      const media=new MediaRecorder(stream);
      const chunks:Blob[]=[];
      current.media=media;
      media.ondataavailable=(event)=>{if (event.data.size) chunks.push(event.data);};
      media.onerror=()=>finish(current,"A gravação foi interrompida. Tente novamente.");
      media.onstop=()=>{
        if (current.sendRequested) void transcribe(current,new Blob(chunks,{type:media.mimeType}));
        else finish(current,"A gravação foi interrompida. Tente novamente.");
      };
      media.start();
      onPhase("recording");
      onStatus("Ouvindo…");
      previewSpeech(current,stream);
    } catch (error) {
      const blocked=error instanceof DOMException && (error.name==="NotAllowedError" || error.name==="SecurityError");
      finish(current,blocked ? "Permita o microfone para este site e tente de novo." : "O microfone não pôde ser aberto. Confira se ele está conectado.");
    }
  }

  function cancel() {
    const current=recording.current;
    if (!current) return;
    if (phase==="working") {worker.current?.terminate();worker.current=null;}
    finish(current);
  }

  function send() {
    const current=recording.current;
    if (current?.media?.state!=="recording") return;
    current.sendRequested=true;
    onPhase("working");
    onStatus("");
    const preview=current.preview;
    if (preview) {
      current.browserResult=new Promise<string>((resolve)=>{
        const timer=window.setTimeout(()=>current.completePreview?.(""),1250);
        current.completePreview=(text)=>{
          window.clearTimeout(timer);
          current.completePreview=undefined;
          resolve(text);
        };
        try {preview.stop();} catch {current.completePreview?.("");}
      });
    }
    current.media.stop();
  }

  return <>
    {phase!=="idle" && <button type="button" className="composer-voice-cancel" aria-label="Cancelar áudio" onClick={cancel}><X size={17}/></button>}
    <button type="button" className="composer-record" aria-label={phase==="recording" ? "Enviar áudio" : "Falar"}
      title={phase==="recording" ? "Enviar áudio" : "Falar"}
      disabled={phase==="opening" || phase==="working"} data-recording={phase==="recording"}
      onClick={()=>phase==="recording" ? send() : void start()}>
      {phase==="recording" ? <Send size={17}/> : <Mic size={18}/>}
    </button>
  </>;
}
