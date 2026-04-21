"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  id: string;
  src: string;
  index: number;
  onRemove: () => void;
  rotation: number;
}

export default function SortablePhoto({
  id,
  src,
  index,
  onRemove,
  rotation,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: `${style.transform || ""} rotate(${rotation}deg)`,
      }}
      className={`relative group ${isDragging ? "scale-105" : ""}`}
      {...attributes}
    >
      {/* Polaroid-style card */}
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing bg-white p-2 pb-8 sticker-shadow rounded-sm hover:scale-105 transition-transform duration-200"
        style={{ boxShadow: "0 4px 16px rgba(58,47,37,0.18)" }}
      >
        <div className="aspect-[3/4] overflow-hidden bg-ecru relative">
          <img
            src={src}
            alt={`photo ${index + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Tiny frame number */}
          <div className="absolute bottom-1 right-2 font-mono text-[9px] tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded-sm">
            #{String(index + 1).padStart(2, "0")}
          </div>
        </div>
        {/* Handwritten caption space */}
        <div className="text-center font-italic italic text-[10px] text-sepia mt-1.5">
          frame {index + 1}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-tomato text-cream text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10"
        aria-label="remove photo"
      >
        ✕
      </button>
    </div>
  );
}
