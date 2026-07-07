/// <reference types="youtube" />

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoading = false;
const apiCallbacks: (() => void)[] = [];

export function loadYTApi(cb: () => void) {
  if (window.YT?.Player) {
    cb();
    return;
  }
  apiCallbacks.push(cb);
  if (apiLoading) return;
  apiLoading = true;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    prev?.();
    apiCallbacks.forEach((fn) => fn());
    apiCallbacks.length = 0;
  };
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}
