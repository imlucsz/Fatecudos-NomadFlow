"use client";

import { useEffect, useRef, useState } from "react";
import { Media } from "./ui";

const sources = ["/videos/nomadflow-hero.mp4?v=1080p", "/videos/nomadflow-hero.webm?v=1080p"];
const hideAfter = 1_500;
const retryAfter = 7_000;

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const source = sources[attempt];

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const video = element;

    const controller = new AbortController();
    const options = { signal: controller.signal };
    const hasFrameCallback = typeof video.requestVideoFrameCallback === "function";
    let frameCallback: number | undefined;
    let lastFrameAt = performance.now();
    let lastTime = video.currentTime;
    let wasVisible = false;

    function recover() {
      setAttempt((current) => current === attempt ? current + 1 : current);
    }

    function resume() {
      if (document.hidden) return;
      if (video.ended) video.currentTime = 0;
      video.muted = true;
      void video.play().catch(() => {
        if (video.error && !controller.signal.aborted) recover();
      });
    }

    function showFrame(now: number) {
      lastFrameAt = now;
      if (!video.dataset.frameVisible) video.dataset.frameVisible = "true";
    }

    function onVideoFrame(now: number) {
      showFrame(now);
      frameCallback = video.requestVideoFrameCallback(onVideoFrame);
    }

    function onVisibilityChange() {
      wasVisible = false;
      delete video.dataset.frameVisible;
      resume();
    }

    video.addEventListener("error", recover, options);
    video.addEventListener("ended", resume, options);
    document.addEventListener("visibilitychange", onVisibilityChange, options);
    window.addEventListener("pageshow", onVisibilityChange, options);
    if (hasFrameCallback) frameCallback = video.requestVideoFrameCallback(onVideoFrame);
    resume();

    const monitor = window.setInterval(() => {
      const now = performance.now();
      const { top, bottom } = video.getBoundingClientRect();
      const visible = !document.hidden && bottom > 0 && top < window.innerHeight;
      if (!visible) {
        wasVisible = false;
        return;
      }

      if (!wasVisible) lastFrameAt = now;
      wasVisible = true;

      // Older browsers expose the playback clock in place of frame callbacks.
      if (!hasFrameCallback && video.readyState >= video.HAVE_CURRENT_DATA && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        showFrame(now);
      }

      const idle = now - lastFrameAt;
      if (idle >= hideAfter) delete video.dataset.frameVisible;
      if (idle >= retryAfter || video.error) recover();
      else if (video.paused) resume();
    }, 500);

    return () => {
      controller.abort();
      if (frameCallback !== undefined) video.cancelVideoFrameCallback(frameCallback);
      window.clearInterval(monitor);
    };
  }, [attempt]);

  return <div className="hero-video" aria-hidden="true">
    <Media name="hero-video-still" eager/>
    {source && <video key={source} ref={videoRef} src={source} autoPlay muted loop playsInline preload="auto"
      disablePictureInPicture disableRemotePlayback/>}
  </div>;
}
