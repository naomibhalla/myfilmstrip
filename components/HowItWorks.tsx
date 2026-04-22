"use client";

import { motion } from "framer-motion";

// ========== MAIN COMPONENT ==========

export default function HowItWorks() {
  return (
    <section className="w-full pb-12 pt-16 md:pt-24">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollCue />
      </div>

      {/* Full-bleed torn paper */}
      <TornPaperDivider />

      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="text-center mb-6">
          <div className="font-italic italic text-sepia text-sm mb-1">
            three little steps
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-ink leading-tight">
            how it works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <Step
            number="01"
            title="drop your photos"
            caption="up to 4 photos from your phone"
            rotation={-1.5}
            delay={0}
          >
            <StepUploadIllustration />
          </Step>
          <Step
            number="02"
            title="pick your vibe"
            caption="3 vintage film finishes"
            rotation={1}
            delay={0.1}
          >
            <StepStyleIllustration />
          </Step>
          <Step
            number="03"
            title="download your strip"
            caption="save as a png, keep forever"
            rotation={-0.5}
            delay={0.2}
          >
            <StepDownloadIllustration />
          </Step>
        </div>

        <div className="text-center mt-6">
          <div className="font-italic italic text-sepia text-xs">
            ready when you are ✿
          </div>
        </div>
      </div>
    </section>
  );
}

// ========== SCROLL CUE ==========

function ScrollCue() {
  return (
    <motion.div
      className="flex flex-col items-center gap-1 pb-4"
      animate={{ y: [0, 4, 0] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    >
      <div className="font-mono font-light text-[10px] tracking-[4px] uppercase text-sepia">
        how it works
      </div>
      <motion.div
        className="text-sepia text-lg"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        ↓
      </motion.div>
    </motion.div>
  );
}

// ========== TORN PAPER DIVIDER (full-bleed, subtle wavy rip) ==========
// Creates a believable "two paper layers" effect:
// - Top layer (above the rip): lighter cream, slight drop shadow at the torn edge
// - Bottom layer (below the rip): the page background shows through, or we stack colors
// - The rip itself is a gentle, wavy line — NOT dramatic zigzags

function TornPaperDivider() {
  // Use a smooth curve (not zigzag), high segment count for fine detail
  const width = 2000;
  const height = 70;
  const segments = 40; // fewer segments but smoothed — creates gentle waves

  // Seeded random for consistent edge
  let seed = 137;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate control points along the rip — gentle, wavy variation
  // The rip sits roughly at the vertical midpoint, with small (~6-10px) deviations
  const midY = height / 2;
  const amplitude = 8;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    // Gentle wave with small random jitter
    const baseWave = Math.sin((i / segments) * Math.PI * 3.2) * 3;
    const jitter = (rand() - 0.5) * amplitude;
    const y = midY + baseWave + jitter;
    points.push({ x, y });
  }

  // Build smooth path using quadratic curves between midpoints
  let path = `M 0 ${height} L 0 ${points[0].y.toFixed(1)} `;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const next = points[i + 1];
    const midX = (p.x + next.x) / 2;
    const midYp = (p.y + next.y) / 2;
    path += `Q ${p.x.toFixed(1)} ${p.y.toFixed(1)}, ${midX.toFixed(1)} ${midYp.toFixed(1)} `;
  }
  const last = points[points.length - 1];
  path += `L ${last.x.toFixed(1)} ${last.y.toFixed(1)} L ${width} ${height} Z`;

  return (
    <div
      className="relative w-full overflow-hidden"
      aria-hidden="true"
      style={{
        marginLeft: 0,
        marginRight: 0,
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: "70px", display: "block" }}
      >
        <defs>
          {/* Soft shadow filter beneath the torn edge */}
          <filter id="ripShadow" x="-5%" y="-5%" width="110%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top paper layer — slightly lighter cream, cut off by the rip */}
        <path
          d={path}
          fill="#faf5ea"
          filter="url(#ripShadow)"
        />

        {/* Thin inner edge highlight on the rip for paper thickness */}
        <path
          d={path.replace(/Z$/, "")}
          fill="none"
          stroke="#ebe3d3"
          strokeWidth="1"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

// ========== STEP WRAPPER ==========

function Step({
  number,
  title,
  caption,
  rotation,
  delay,
  children,
}: {
  number: string;
  title: string;
  caption: string;
  rotation: number;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3, rotate: rotation * 1.4 }}
      style={{ transform: `rotate(${rotation}deg)` }}
      className="paper-card rounded-sm p-3 md:p-4 relative"
    >
      <div className="absolute -top-2 left-3 bg-ink text-cream font-mono font-light text-[9px] tracking-[3px] px-2 py-0.5 rounded-sm">
        STEP {number}
      </div>

      <div className="aspect-[5/3] w-full bg-ecru/40 rounded-sm mb-2.5 flex items-center justify-center overflow-hidden p-2">
        {children}
      </div>

      <h3 className="font-display text-lg md:text-xl text-ink leading-tight mb-0.5">
        {title}
      </h3>
      <p className="font-italic italic text-sepia text-xs leading-snug">
        {caption}
      </p>
    </motion.div>
  );
}

// ========== ILLUSTRATION 1: UPLOAD ==========

function StepUploadIllustration() {
  return (
    <svg
      viewBox="0 0 200 150"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(40, 30) rotate(-8)">
        <rect width="50" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="1" />
        <rect x="4" y="4" width="42" height="42" fill="#d4a574" />
        <circle cx="25" cy="25" r="8" fill="#8b6f47" opacity="0.4" />
      </g>
      <g transform="translate(70, 45) rotate(4)">
        <rect width="50" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="1" />
        <rect x="4" y="4" width="42" height="42" fill="#e8a87c" />
        <path
          d="M 8 30 L 18 20 L 28 28 L 38 18 L 46 26 L 46 46 L 4 46 Z"
          fill="#a86a4a"
          opacity="0.5"
        />
      </g>
      <g transform="translate(100, 35) rotate(-3)">
        <rect width="50" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="1" />
        <rect x="4" y="4" width="42" height="42" fill="#c9b89a" />
        <circle cx="18" cy="20" r="5" fill="#8a7560" opacity="0.5" />
        <rect x="10" y="28" width="30" height="14" fill="#8a7560" opacity="0.4" rx="1" />
      </g>
      <g transform="translate(130, 50) rotate(8)">
        <rect width="50" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="1" />
        <rect x="4" y="4" width="42" height="42" fill="#d4a5a5" />
        <path d="M 10 36 Q 25 22 40 36" stroke="#8a7560" strokeWidth="1.5" fill="none" opacity="0.6" />
      </g>
      <g opacity="0.6">
        <path
          d="M 100 115 L 100 130 M 95 125 L 100 130 L 105 125"
          stroke="#3a2f25"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <g fill="#c9b89a" opacity="0.7">
        <path d="M 30 70 L 31 74 L 35 75 L 31 76 L 30 80 L 29 76 L 25 75 L 29 74 Z" />
        <path d="M 170 25 L 171 28 L 174 29 L 171 30 L 170 33 L 169 30 L 166 29 L 169 28 Z" />
      </g>
    </svg>
  );
}

// ========== ILLUSTRATION 2: PICK YOUR VIBE ==========

function StepStyleIllustration() {
  return (
    <svg
      viewBox="0 0 200 150"
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(20, 40)">
        <rect width="45" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="2" />
        <rect x="4" y="4" width="37" height="37" fill="#3a3a3a" />
        <rect x="4" y="4" width="37" height="37" fill="url(#bwGrad)" />
        <text x="22.5" y="54" textAnchor="middle" fontSize="5" fontFamily="monospace" fill="#3a2f25">
          B&amp;W
        </text>
      </g>
      <g transform="translate(75, 25)">
        <rect width="50" height="68" fill="white" stroke="#3a2f25" strokeWidth="1.5" rx="2" />
        <rect x="4" y="4" width="42" height="42" fill="url(#warmGrad)" />
        <text x="25" y="58" textAnchor="middle" fontSize="5.5" fontFamily="monospace" fill="#3a2f25" fontWeight="bold">
          WARM
        </text>
        <circle cx="46" cy="4" r="5" fill="#3a2f25" />
        <path d="M 43.5 4 L 45.5 6 L 48.5 2" stroke="#f5f1e8" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(135, 40)">
        <rect width="45" height="60" fill="white" stroke="#c9b89a" strokeWidth="0.8" rx="2" />
        <rect x="4" y="4" width="37" height="37" fill="url(#filmGrad)" />
        <text x="22.5" y="54" textAnchor="middle" fontSize="5" fontFamily="monospace" fill="#3a2f25">
          FILM
        </text>
      </g>
      <g transform="translate(97, 100)">
        <path d="M 0 0 L 6 -8 L 12 0 Z" fill="#3a2f25" opacity="0.75" />
      </g>
      <g fill="#d4a574" opacity="0.8">
        <circle cx="100" cy="18" r="1.5" />
        <circle cx="108" cy="15" r="1" />
        <circle cx="92" cy="16" r="1" />
      </g>
      <defs>
        <linearGradient id="bwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6a6a6a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="warmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4d4a1" />
          <stop offset="60%" stopColor="#c48850" />
          <stop offset="100%" stopColor="#8b5a2b" />
        </linearGradient>
        <linearGradient id="filmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d46856" />
          <stop offset="50%" stopColor="#8b4458" />
          <stop offset="100%" stopColor="#2a3f5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ========== ILLUSTRATION 3: DOWNLOAD ==========

function StepDownloadIllustration() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(80, 22) rotate(-3)">
        <rect width="42" height="92" fill="#1a1612" stroke="#3a2f25" strokeWidth="0.3" rx="2" />
        <rect x="5" y="6" width="32" height="24" fill="#d4a574" rx="0.5" />
        <rect x="5" y="34" width="32" height="24" fill="#e89b5a" rx="0.5" />
        <rect x="5" y="62" width="32" height="24" fill="#c48850" rx="0.5" />
        <rect x="1.5" y="10" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="22" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="34" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="46" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="58" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="70" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="1.5" y="82" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="10" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="22" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="34" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="46" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="58" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="70" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
        <rect x="38" y="82" width="2.5" height="2.5" fill="#f5f1e8" rx="0.3" />
      </g>
      <g transform="translate(140, 60)">
        <circle cx="0" cy="0" r="14" fill="#3a2f25" />
        <path d="M 0 -6 L 0 5 M -4 1 L 0 5 L 4 1" stroke="#f5f1e8" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(140, 95)">
        <rect x="-14" y="-5" width="28" height="10" fill="#fdf6e5" stroke="#c9b89a" strokeWidth="0.5" rx="1" />
        <text x="0" y="2" textAnchor="middle" fontSize="5.5" fontFamily="monospace" fill="#3a2f25" fontWeight="bold">
          .PNG
        </text>
      </g>
      <g fill="#d4a574" opacity="0.8">
        <path d="M 40 50 L 41 54 L 45 55 L 41 56 L 40 60 L 39 56 L 35 55 L 39 54 Z" />
        <circle cx="170" cy="30" r="1.5" />
        <circle cx="175" cy="40" r="1" />
      </g>
    </svg>
  );
}
