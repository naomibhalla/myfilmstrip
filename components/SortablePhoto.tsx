"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";

export interface PhotoCrop {
  zoom: number; // 1.0 = no zoom, 3.0 = 3x zoom
  offsetX: number; // -50 to 50 (percentage offset from center)
  offsetY: number; // -50 to 50
}

interface Props {
  id: string;
  src: string;
  index: number;
  crop: PhotoCrop;
  onRemove: () => void;
  onCropChange: (crop: PhotoCrop) => void;
  rotation: number;
  isEditing: boolean;
  onEditToggle: () => void;
  onEditClose: () => void;
}

export default function SortablePhoto({
  id,
  src,
  index,
  crop,
  onRemove,
  onCropChange,
  rotation,
  isEditing,
  onEditToggle,
  onEditClose,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : isEditing ? 40 : 1,
  };

  // Calculate image transform based on crop state
  const imageTransform = `scale(${crop.zoom}) translate(${-crop.offsetX}%, ${-crop.offsetY}%)`;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        transform: isEditing
          ? style.transform || ""
          : `${style.transform || ""} rotate(${rotation}deg)`,
      }}
      className={`relative group ${isDragging ? "scale-105" : ""} ${
        isEditing ? "col-span-2" : ""
      }`}
      {...(isEditing ? {} : attributes)}
    >
      {isEditing ? (
        <CropEditor
          src={src}
          index={index}
          crop={crop}
          onCropChange={onCropChange}
          onClose={onEditClose}
        />
      ) : (
        <>
          {/* Polaroid-style card */}
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-white p-2 pb-8 sticker-shadow rounded-sm hover:scale-105 transition-transform duration-200 select-none"
            style={{
              boxShadow: "0 4px 16px rgba(58,47,37,0.18)",
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            <div className="aspect-[3/4] overflow-hidden bg-ecru relative">
              <img
                src={src}
                alt={`photo ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  transform: imageTransform,
                  transformOrigin: "center center",
                }}
                draggable={false}
              />
              <div className="absolute bottom-1 right-2 font-mono text-[9px] tracking-widest text-white/90 bg-black/40 px-1.5 py-0.5 rounded-sm">
                #{String(index + 1).padStart(2, "0")}
              </div>
            </div>
            <div className="text-center font-italic italic text-[10px] text-sepia mt-1.5">
              frame {index + 1}
            </div>
          </div>

          {/* Edit button — top left */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditToggle();
            }}
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-ink text-cream text-xs flex items-center justify-center shadow-md hover:scale-110 transition-all z-10"
            aria-label="edit photo"
          >
            ✎
          </button>

          {/* Remove button — top right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-tomato text-cream text-xs flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10"
            aria-label="remove photo"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

// ========== CROP EDITOR ==========

function CropEditor({
  src,
  index,
  crop,
  onCropChange,
  onClose,
}: {
  src: string;
  index: number;
  crop: PhotoCrop;
  onCropChange: (crop: PhotoCrop) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStart = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // Pointer-based drag for repositioning within the frame
  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingImage(true);
    dragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: crop.offsetX,
      startOffsetY: crop.offsetY,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDraggingImage || !dragStart.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.startX;
    const dy = e.clientY - dragStart.current.startY;

    // Convert pixel delta to percentage of container size
    // Invert because moving image right = offsetX decreases (we show more of left side)
    // Divide by zoom so higher zoom = more precise control
    const pctDx = (dx / rect.width) * 100 / crop.zoom;
    const pctDy = (dy / rect.height) * 100 / crop.zoom;

    // Clamp to reasonable range based on zoom level
    const maxOffset = ((crop.zoom - 1) / crop.zoom) * 50;
    const newOffsetX = Math.max(
      -maxOffset,
      Math.min(maxOffset, dragStart.current.startOffsetX - pctDx)
    );
    const newOffsetY = Math.max(
      -maxOffset,
      Math.min(maxOffset, dragStart.current.startOffsetY - pctDy)
    );

    onCropChange({
      ...crop,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDraggingImage(false);
    dragStart.current = null;
  }

  function handleZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newZoom = parseFloat(e.target.value);
    // When zoom changes, clamp offsets so image doesn't go out of bounds
    const maxOffset = ((newZoom - 1) / newZoom) * 50;
    onCropChange({
      zoom: newZoom,
      offsetX: Math.max(-maxOffset, Math.min(maxOffset, crop.offsetX)),
      offsetY: Math.max(-maxOffset, Math.min(maxOffset, crop.offsetY)),
    });
  }

  function handleReset() {
    onCropChange({ zoom: 1, offsetX: 0, offsetY: 0 });
  }

  const imageTransform = `scale(${crop.zoom}) translate(${-crop.offsetX}%, ${-crop.offsetY}%)`;

  return (
    <div
      className="relative bg-white p-3 pb-5 rounded-sm"
      style={{
        boxShadow: "0 8px 32px rgba(58,47,37,0.25)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-italic italic text-sepia text-xs">
            editing frame {index + 1}
          </div>
          <div className="font-mono font-light text-[10px] tracking-widest uppercase text-ink">
            drag to reposition
          </div>
        </div>
        <button
          onClick={handleReset}
          className="font-mono font-light text-[9px] tracking-widest uppercase text-sepia hover:text-ink transition-colors"
        >
          reset
        </button>
      </div>

      {/* Image with drag-to-reposition */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`aspect-[3/4] overflow-hidden bg-ecru relative ${
          isDraggingImage ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
      >
        <img
          src={src}
          alt={`editing ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{
            transform: imageTransform,
            transformOrigin: "center center",
            transition: isDraggingImage ? "none" : "transform 0.2s ease",
          }}
          draggable={false}
        />

        {/* Grid overlay for visual guidance */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
      </div>

      {/* Zoom slider */}
      <div className="mt-3 mb-2">
        <div className="flex justify-between items-center mb-1">
          <div className="font-mono font-light text-[9px] tracking-widest uppercase text-sepia">
            zoom
          </div>
          <div className="font-mono font-light text-[9px] text-sepia">
            {crop.zoom.toFixed(1)}x
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={crop.zoom}
          onChange={handleZoomChange}
          className="w-full h-1 accent-ink cursor-pointer"
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Done button */}
      <button
        onClick={onClose}
        className="w-full mt-2 py-2 bg-ink text-cream rounded-sm font-mono font-light text-[10px] tracking-[3px] uppercase hover:bg-sepia transition-colors"
      >
        done
      </button>
    </div>
  );
}
