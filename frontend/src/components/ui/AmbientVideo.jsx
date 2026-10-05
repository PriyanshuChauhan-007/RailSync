import { useEffect, useRef } from "react";

export default function AmbientVideo({ src, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    const playVideo = () => {
      try {
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {});
        }
      } catch {
        // Safe fallback
      }
    };

    // Immediate playback on mount
    playVideo();

    video.addEventListener("loadedmetadata", playVideo);
    video.addEventListener("canplay", playVideo);

    const handleFirstInteraction = () => {
      playVideo();
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("scroll", handleFirstInteraction);
    };

    document.addEventListener("pointerdown", handleFirstInteraction, { passive: true });
    document.addEventListener("scroll", handleFirstInteraction, { passive: true });

    let observer;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            playVideo();
          } else {
            video.pause();
          }
        },
        { threshold: 0.05 },
      );
      observer.observe(video);
    }

    return () => {
      video.removeEventListener("loadedmetadata", playVideo);
      video.removeEventListener("canplay", playVideo);
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("scroll", handleFirstInteraction);
      if (observer) {
        observer.disconnect();
      }
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
      aria-hidden="true"
    />
  );
}

