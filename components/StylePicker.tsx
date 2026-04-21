"use client";

import { FilmStyle } from "@/lib/imageProcessing";

interface Props {
  value: FilmStyle;
  onChange: (style: FilmStyle) => void;
}

const styles: { id: FilmStyle; name: string; tagline: string; gradient: string; emoji: string }[] = [
  {
    id: "classic-bw",
    name: "classic b&w",
    tagline: "ilford hp5 400",
    gradient: "linear-gradient(135deg, #4a4a4a 0%, #1a1a1a 100%)",
    emoji: "◐",
  },
  {
    id: "warm-vintage",
    name: "warm vintage",
    tagline: "kodak gold 200",
    gradient: "linear-gradient(135deg, #f4d4a1 0%, #c48850 60%, #8b5a2b 100%)",
    emoji: "☀",
  },
  {
    id: "film-camera",
    name: "film camera",
    tagline: "cinestill 800t",
    gradient: "linear-gradient(135deg, #d46856 0%, #8b4458 50%, #2a3f5f 100%)",
    emoji: "✦",
  },
];

export default function StylePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {styles.map((s) => {
        const selected = s.id === value;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`relative group p-2 pb-3 transition-all duration-200 ${
              selected
                ? "bg-ink text-cream scale-105"
                : "bg-white/70 text-ink hover:bg-white hover:scale-102"
            } sticker-shadow rounded-sm`}
            style={{
              transform: selected ? "rotate(-1deg) scale(1.05)" : "rotate(0deg)",
            }}
          >
            <div
              className="w-full aspect-square rounded-sm mb-2 relative overflow-hidden"
              style={{ background: s.gradient }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-2xl text-white/40">
                {s.emoji}
              </div>
              {selected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cream text-ink text-[10px] flex items-center justify-center">
                  ✓
                </div>
              )}
            </div>
            <div className="font-mono text-[10px] tracking-wider uppercase font-bold">
              {s.name}
            </div>
            <div
              className={`font-italic italic text-[10px] mt-0.5 ${
                selected ? "text-cream/70" : "text-sepia"
              }`}
            >
              {s.tagline}
            </div>
          </button>
        );
      })}
    </div>
  );
}
