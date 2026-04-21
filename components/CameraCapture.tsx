"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onCapture: (dataUrls: string[]) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [captures, setCaptures] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

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
      } catch (e) {
        setError("camera access denied. please allow camera permission & try again.");
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

  function capturePhoto(): string | null {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    // Mirror the image (selfie convention)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function runSequence() {
    setIsCapturing(true);
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      // Countdown 3, 2, 1
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise((r) => setTimeout(r, 900));
      }
      setCountdown(null);
      // Flash
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      const photo = capturePhoto();
      if (photo) {
        results.push(photo);
        setCaptures([...results]);
        setCapturedCount(results.length);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    setIsCapturing(false);
    // Stop stream before returning
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCapture(results);
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-ink/90 z-50 flex items-center justify-center p-6">
        <div className="paper-card p-8 max-w-sm text-center">
          <div className="font-display text-2xl mb-3">oh no ✿</div>
          <p className="font-mono text-sm mb-6">{error}</p>
          <button onClick={onCancel} className="btn-ink">
            go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-cream">
        <button
          onClick={onCancel}
          className="font-mono text-xs tracking-widest uppercase opacity-80 hover:opacity-100"
        >
          ← cancel
        </button>
        <div className="font-mono text-xs tracking-widest">
          {capturedCount}/4 captured
        </div>
      </div>

      {/* Video feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Flash effect */}
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

        {/* Countdown overlay */}
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

      {/* Thumbnail strip */}
      <div className="p-4 bg-ink">
        <div className="flex gap-2 justify-center mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-14 h-18 rounded-sm border border-sepia/40 overflow-hidden bg-ink/50"
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

        {!isCapturing && (
          <div className="flex justify-center">
            <button
              onClick={runSequence}
              className="bg-cream text-ink px-8 py-3 rounded-full font-mono text-xs tracking-[3px] uppercase font-bold hover:scale-105 transition-transform"
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
    </div>
  );
}
