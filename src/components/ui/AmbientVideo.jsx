import { useEffect, useRef } from "react";

export default function AmbientVideo({ src, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Explicitly set DOM properties for strict browser autoplay policies on PC/desktop
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");

    const playVideo = () => {
      if (!video) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay restricted until interaction; handled by interaction listeners below
        });
      }
    };

    // Attempt autoplay immediately upon mount
    playVideo();

    // Also attempt when metadata and media can play
    const onLoaded = () => playVideo();
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("canplay", onLoaded);
    video.addEventListener("loadeddata", onLoaded);

    // Keep active when in view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playVideo();
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.05] },
    );

    observer.observe(video);

    // If browser Autoplay Policy requires user gesture on PC,
    // trigger playback seamlessly on any user interaction (click, scroll, key, pointer)
    const onUserGesture = () => {
      if (video && video.paused) {
        playVideo();
      }
    };

    window.addEventListener("click", onUserGesture, { passive: true });
    window.addEventListener("scroll", onUserGesture, { passive: true });
    window.addEventListener("keydown", onUserGesture, { passive: true });
    window.addEventListener("pointerdown", onUserGesture, { passive: true });

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("canplay", onLoaded);
      video.removeEventListener("loadeddata", onLoaded);
      window.removeEventListener("click", onUserGesture);
      window.removeEventListener("scroll", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
      window.removeEventListener("pointerdown", onUserGesture);
    };
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      aria-hidden="true"
      onClick={(e) => {
        const v = e.currentTarget;
        v.muted = true;
        if (v.paused) {
          v.play().catch(() => {});
        }
      }}
    />
  );
}

