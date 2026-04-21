"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onCapture: (dataUrls: string[]) => void;
  onCancel: () => void;
}

type Phase = "capturing" | "review";

export default function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("capturing");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [retakingSlot, setRetakingSlot] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Start camera once, keep running until cancel/done
  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1280, height: 960 },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (e) {
        setError(
          "camera access denied. please allow camera permission & try again."
        );
      }
    }
    startCamera();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Re-attach stream when video element re-renders (phase changes)
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase, retakingSlot]);

  function capturePhoto(): string | null {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function runSequence() {
    setIsCapturing(true);
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise((r) => setTimeout(r, 900));
      }
      setCountdown(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const photo = capturePhoto();
      if (photo) {
        results.push(photo);
        setCaptures([...results]);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    setIsCapturing(false);
    setPhase("review");
  }

  async function runSingleRecapture(slotIndex: number) {
    setRetakingSlot(slotIndex);
    setPhase("capturing");
    setIsCapturing(true);
    // Give video element time to remount + re-attach stream
    await new Promise((r) => setTimeout(r, 500));
    for (let c = 3; c > 0; c--) {
      setCountdown(c);
      await new Promise((r) => setTimeout(r, 900));
    }
    setCountdown(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    const photo = capturePhoto();
    if (photo) {
      setCaptures((prev) => {
        const next = [...prev];
        next[slotIndex] = photo;
        return next;
      });
    }
    await new Promise((r) => setTimeout(r, 500));
    setIsCapturing(false);
    setRetakingSlot(null);
    setPhase("review");
  }

  function handleUseThese() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCapture(captures);
  }

  function handleCancel() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-ink/90 z-50 flex items-center justify-center p-6">
        <div className="paper-card p-8 max-w-sm text-center">
          <div className="font-display text-2xl mb-3">oh no ✿</div>
          <p className="font-mono text-sm mb-6">{error}</p>
          <button onClick={handleCancel} className="btn-ink">
            go back
          </button>
        </div>
      </div>
    );
  }

  // ALWAYS render the camera view. Review UI overlays on top when in review phase.
  // This ensures video element is never unmounted, so stream stays connected.
  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col">
      {/* Header (shown only during capture phase) */}
      {phase === "capturing" && (
        <div className="flex justify-between items-center p-4 text-cream relative z-10">
          <button
            onClick={handleCancel}
            className="font-mono font-light text-xs tracking-widest uppercase opacity-80 hover:opacity-100"
          >
            ← cancel
          </button>
          <div className="font-mono font-light text-xs tracking-widest">
            {retakingSlot !== null
              ? `retaking #${String(retakingSlot + 1).padStart(2, "0")}`
              : `${captures.length}/4 captured`}
          </div>
        </div>
      )}

      {/* Video feed - always rendered */}
      <div
        className={`${
          phase === "capturing" ? "flex-1" : "hidden"
        } relative flex items-center justify-center overflow-hidden`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Countdown */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="font-display text-[180px] text-cream drop-shadow-2xl">
                {countdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer during capture phase */}
      {phase === "capturing" && retakingSlot === null && (
        <div className="p-4 bg-ink">
          <div className="flex gap-2 justify-center mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-14 rounded-sm border border-sepia/40 overflow-hidden bg-ink/50"
                style={{ aspectRatio: "3/4" }}
              >
                {captures[i] ? (
                  <img
                    src={captures[i]}
                    alt={`capture ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sepia text-xs">
                    {i + 1}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isCapturing && cameraReady && (
            <div className="flex justify-center">
              <button
                onClick={runSequence}
                className="bg-cream text-ink px-8 py-3 rounded-full font-mono font-light text-xs tracking-[3px] uppercase hover:scale-105 transition-transform"
              >
                start photo session
              </button>
            </div>
          )}

          {isCapturing && (
            <div className="text-center font-italic italic text-cream/70 text-sm">
              smile! taking 4 photos in a row...
            </div>
          )}
        </div>
      )}

      {/* Re-capture mode footer */}
      {phase === "capturing" && retakingSlot !== null && (
        <div className="p-4 bg-ink text-center">
          <div className="font-italic italic text-cream/70 text-sm">
            get ready... retaking photo #
            {String(retakingSlot + 1).padStart(2, "0")}
          </div>
        </div>
      )}

      {/* REVIEW PHASE OVERLAY */}
      {phase === "review" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-cream z-20 flex flex-col overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 md:p-6">
            <button
              onClick={handleCancel}
              className="font-mono font-light text-xs tracking-widest text-sepia hover:text-ink transition-colors"
            >
              ← cancel
            </button>
            <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-sepia">
              review your shots
            </div>
          </div>

          {/* Title */}
          <div className="text-center px-6 mb-8 md:mb-10">
            <div className="font-italic italic text-sepia text-base mb-2">
              look good?
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-2">
              tap any photo to retake
            </h2>
            <p className="font-italic italic text-sepia text-sm">
              or keep them all as-is ✿
            </p>
          </div>

          {/* Photo grid */}
          <div className="px-5 md:px-8 flex-1">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {captures.map((src, i) => (
                <motion.button
                  key={i}
                  onClick={() => runSingleRecapture(i)}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group bg-white p-2 pb-5 rounded-sm cursor-pointer"
                  style={{
                    transform: `rotate(${[-2, 1.5, -1.5, 2][i]}deg)`,
                    boxShadow: "0 4px 16px rgba(58,47,37,0.18)",
                  }}
                >
                  <div
                    className="w-full bg-ink overflow-hidden"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <img
                      src={src}
                      alt={`capture ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute top-3 left-3 font-mono font-light text-[9px] tracking-widest uppercase bg-black/50 text-cream px-1.5 py-0.5 rounded-sm">
                    #{String(i + 1).padStart(2, "0")}
                  </div>

                  <div className="absolute inset-0 rounded-sm bg-ink/0 group-hover:bg-ink/40 transition-colors duration-200 flex items-center justify-center">
                    <div className="font-mono font-light text-xs tracking-widest uppercase text-cream opacity-0 group-hover:opacity-100 transition-opacity bg-ink/80 px-3 py-2 rounded-sm">
                      retake ↻
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="p-5 md:p-8 max-w-md mx-auto w-full">
            <button
              onClick={handleUseThese}
              className="btn-ink w-full group inline-flex items-center justify-center gap-2"
            >
              <span>use these photos</span>
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </button>
            <div className="text-center font-italic italic text-faded text-xs mt-4">
              tap a photo above to retake just that one
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
