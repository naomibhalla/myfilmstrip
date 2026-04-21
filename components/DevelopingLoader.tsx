"use client";

import { motion } from "framer-motion";

export default function DevelopingLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/85 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="text-center">
        {/* Film reel SVG spinning */}
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        >
          <circle cx="60" cy="60" r="50" fill="none" stroke="#f5f1e8" strokeWidth="3" />
          <circle cx="60" cy="60" r="42" fill="none" stroke="#f5f1e8" strokeWidth="1" />
          <circle cx="60" cy="60" r="10" fill="#f5f1e8" />
          {/* Spokes */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <line
              key={deg}
              x1="60"
              y1="60"
              x2="60"
              y2="20"
              stroke="#f5f1e8"
              strokeWidth="2"
              transform={`rotate(${deg} 60 60)`}
            />
          ))}
        </motion.svg>

        <motion.div
          className="font-mono text-cream text-sm tracking-[4px] uppercase mt-8"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          developing film
        </motion.div>
        <div className="font-italic italic text-faded text-xs mt-2">
          good things take time...
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cream"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
