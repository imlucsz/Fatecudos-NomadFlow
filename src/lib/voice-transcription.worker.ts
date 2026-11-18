import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let model:Promise<AutomaticSpeechRecognitionPipeline>|undefined;
env.allowLocalModels=false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads=1;

self.addEventListener("message",async (event:MessageEvent<Float32Array>)=>{
  try {
    if (!model) {
      self.postMessage({phase:"loading"});
      model=pipeline("automatic-speech-recognition","onnx-community/whisper-tiny",{
        device:"wasm",dtype:"q8",revision:"6d4fb5abc94227ee92e43fc5091278851eadf8a0",
      });
    }
    const transcribe=await model;
    self.postMessage({phase:"transcribing"});
    const result=await transcribe(event.data,{language:"portuguese",task:"transcribe",chunk_length_s:25,stride_length_s:4});
    self.postMessage({phase:"done",text:Array.isArray(result) ? result.map((part)=>part.text).join(" ") : result.text});
  } catch (error) {
    model=undefined;
    self.postMessage({phase:"error",message:error instanceof Error ? error.message : String(error)});
  }
});
