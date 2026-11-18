export type Recognition = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  onresult: ((event:{results:ArrayLike<ArrayLike<{transcript:string}> & {isFinal?:boolean}>})=>void) | null;
  onerror: ((event:{error?:string})=>void) | null;
  onend: (()=>void) | null;
  start:(track?:MediaStreamTrack)=>void;
  stop:()=>void;
  abort?:()=>void;
};

export function browserSpeechRecognition() {
  const browser=window as Window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Constructor=browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}
