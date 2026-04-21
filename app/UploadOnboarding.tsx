"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onFilesSelected: (files: File[]) => void;
  onBack: () => void;
}

export default function UploadOnboarding({ onFilesSelected, onBack }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setHoveredSlot(null);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      onFilesSelected(files.slice(0, 4));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only un-highlight if leaving the main container
    if (e.currentTarget === e.target) {
      setDragOver(false);
    }
  }

  function handleSlotDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    setHoveredSlot(index);
  }

  function handleSlotDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setHoveredSlot(null);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    if (e.target) e.target.value = "";
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen w-full px-5 py-8 md:py-12 max-w-2xl mx-auto flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <button
          onClick={onBack}
          className="font-mono font-light text-xs tracking-widest text-sepia hover:text-ink transition-colors"
        >
          ← back
        </button>
        <div className="text-right">
          <div className="font-mono font-light text-[10px] tracking-[3px] uppercase text-sepia">
            step 01
          </div>
          <div className="font-italic italic text-sm text-faded">
            pick your photos
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <div className="font-italic italic text-sepia text-base mb-2">
          let&apos;s start with
        </div>
        <h2 className="font-display text-4xl md:text-5xl text-ink mb-3">
          upload up to 4 photos
        </h2>
        <p className="font-italic italic text-sepia text-sm">
          drag them right in, or click any slot to browse
        </p>
      </div>

      {/* Drop zone with 4 slots */}
      <div
        className={`relative rounded-md transition-all duration-200 p-6 md:p-10 mb-8 ${
          dragOver
            ? "bg-ecru border-2 border-dashed border-ink scale-[1.02]"
            : "bg-transparent border-2 border-dashed border-sand/60"
        }`}
      >
        {/* Drag overlay message */}
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="bg-ink text-cream px-6 py-3 rounded-sm font-mono text-sm tracking-widest uppercase shadow-lg">
              drop here ✿
            </div>
          </motion.div>
        )}

        {/* 4 slot grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              onDragOver={(e) => handleSlotDragOver(e, i)}
              onDragLeave={handleSlotDragLeave}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`relative cursor-pointer aspect-[3/4] bg-white p-2 pb-6 rounded-sm shadow-md transition-all ${
                hoveredSlot === i ? "scale-105 shadow-lg" : ""
              }`}
              style={{
                transform: `rotate(${[-3, 2, -2, 3][i]}deg)`,
                boxShadow: "0 4px 16px rgba(58,47,37,0.15)",
              }}
            >
              <div className="w-full h-full bg-ecru/60 border-2 border-dashed border-sand/50 rounded-sm flex flex-col items-center justify-center gap-2 group-hover:bg-ecru group-hover:border-sepia/60 transition-all">
                <div className="text-3xl text-sand">+</div>
                <div className="font-mono font-light text-[9px] tracking-widest uppercase text-sepia">
                  slot {i + 1}
                </div>
              </div>
              {/* Tiny caption line */}
              <div className="absolute bottom-1 left-0 right-0 text-center font-italic italic text-[10px] text-faded">
                photo {i + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fallback button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-ink group"
        >
          <span>upload photos</span>
          <span className="ml-2 transition-transform group-hover:translate-x-0.5">
            ↑
          </span>
        </button>
        <div className="font-italic italic text-faded text-xs">
          or drag photos from your desktop ✿
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </motion.section>
  );
}
