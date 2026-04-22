"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";

export interface PhotoCrop {
  zoom: number;
  offsetX: number;
  offsetY: number;
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

// Compute how far the user can pan in each direction, expressed as % of frame.
// At zoom=1 (cover-fit): overflow equals the amount the image extends past the frame.
//   For a wide image (imgRatio > frameRatio), there's horizontal overflow equal to
//   (imgRatio/frameRatio - 1) * 50% in each direction (half of total overflow per side).
// At higher zoom: additional (zoom-1)*50% of overflow becomes pannable on both axes.
function computePanExtent(
  imgW: number,
  imgH: number,
  frameRatio: number,
  zoom: number
) {
  const imgRatio = imgW / imgH;
  let overflowX = 0;
  let overflowY = 0;

  if (imgRatio > frameRatio) {
    // Wide image — at cover-fit, horizontal overflow. Each side has half the excess.
    overflowX = (imgRatio / frameRatio - 1) * 50;
  } else if (imgRatio < frameRatio) {
    overflowY = (frameRatio / imgRatio - 1) * 50;
  }

  // Additional overflow from zooming in
  overflowX += (zoom - 1) * 50;
  overflowY += (zoom - 1) * 50;

  return { overflowX, overflowY };
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
        <PhotoThumbnail
          src={src}
          index={index}
          crop={crop}
          dragListeners={listeners}
          onRemove={onRemove}
          onEditToggle={onEditToggle}
        />
      )}
    </div>
  );
}

// ========== THUMBNAIL ==========

function PhotoThumbnail({
  src,
  index,
  crop,
  dragListeners,
  onRemove,
  onEditToggle,
}: {
  src: string;
  index: number;
  crop: PhotoCrop;
  dragListeners: any;
  onRemove: () => void;
  onEditToggle: () => void;
}) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const frameRatio = 3 / 4;

  // Compute display scale — how much to scale the image so it always covers the frame.
  // At zoom=1 with cover-fit: scale factor = max of (frameW/imgW, frameH/imgH) relative
  // to each other. But easier in CSS: use transform scale relative to "object-fit cover"
  // baseline. Since we use object-fit: cover, scale(1) = image already covers frame.
  // For panning to work, we need the scaled image to overflow in the direction we want.

  // Actual displayed scale (so cover-fit image fits, plus user zoom on top)
  const displayScale = crop.zoom;

  // Calculate translation. offsetX is stored as "% of image dimension in cover-fit space".
  // In CSS transform with scale, translate is relative to the untransformed element size.
  const tx = -crop.offsetX;
  const ty = -crop.offsetY;

  return (
    <>
      <div
        {...dragListeners}
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
              transform: `scale(${displayScale}) translate(${tx}%, ${ty}%)`,
              transformOrigin: "center center",
            }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
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
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStart = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const frameRatio = 3 / 4;
  const { overflowX, overflowY } = imgSize
    ? computePanExtent(imgSize.w, imgSize.h, frameRatio, crop.zoom)
    : { overflowX: 0, overflowY: 0 };

  // Clamp offsets to what's actually pannable
  const clampedOX = Math.max(-overflowX, Math.min(overflowX, crop.offsetX));
  const clampedOY = Math.max(-overflowY, Math.min(overflowY, crop.offsetY));

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingImage(true);
    dragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: clampedOX,
      startOffsetY: clampedOY,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDraggingImage || !dragStart.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.startX;
    const dy = e.clientY - dragStart.current.startY;

    // Convert pixel delta to offset% of frame. Drag right = image shifts right = offsetX decreases.
    const pctDx = (dx / rect.width) * 100;
    const pctDy = (dy / rect.height) * 100;

    const newOffsetX = Math.max(
      -overflowX,
      Math.min(overflowX, dragStart.current.startOffsetX - pctDx)
    );
    const newOffsetY = Math.max(
      -overflowY,
      Math.min(overflowY, dragStart.current.startOffsetY - pctDy)
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
    if (!imgSize) {
      onCropChange({ ...crop, zoom: newZoom });
      return;
    }
    const { overflowX: newOX, overflowY: newOY } = computePanExtent(
      imgSize.w,
      imgSize.h,
      frameRatio,
      newZoom
    );
    onCropChange({
      zoom: newZoom,
      offsetX: Math.max(-newOX, Math.min(newOX, crop.offsetX)),
      offsetY: Math.max(-newOY, Math.min(newOY, crop.offsetY)),
    });
  }

  function handleReset() {
    onCropChange({ zoom: 1, offsetX: 0, offsetY: 0 });
  }

  const canPan = overflowX > 0.5 || overflowY > 0.5;

  return (
    <div
      className="relative bg-white p-3 pb-5 rounded-sm"
      style={{ boxShadow: "0 8px 32px rgba(58,47,37,0.25)" }}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-italic italic text-sepia text-xs">
            editing frame {index + 1}
          </div>
          <div className="font-mono font-light text-[10px] tracking-widest uppercase text-ink">
            {canPan ? "drag to reposition" : "zoom in to reposition"}
          </div>
        </div>
        <button
          onClick={handleReset}
          className="font-mono font-light text-[9px] tracking-widest uppercase text-sepia hover:text-ink transition-colors"
        >
          reset
        </button>
      </div>

      <div
        ref={containerRef}
        onPointerDown={canPan ? handlePointerDown : undefined}
        onPointerMove={canPan ? handlePointerMove : undefined}
        onPointerUp={canPan ? handlePointerUp : undefined}
        onPointerCancel={canPan ? handlePointerUp : undefined}
        className={`aspect-[3/4] overflow-hidden bg-ecru relative ${
          canPan
            ? isDraggingImage
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-default"
        }`}
        style={{ touchAction: "none" }}
      >
        <img
          src={src}
          alt={`editing ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{
            transform: `scale(${crop.zoom}) translate(${-clampedOX}%, ${-clampedOY}%)`,
            transformOrigin: "center center",
            transition: isDraggingImage ? "none" : "transform 0.2s ease",
          }}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          draggable={false}
        />

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
      </div>

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

      <button
        onClick={onClose}
        className="w-full mt-2 py-2 bg-ink text-cream rounded-sm font-mono font-light text-[10px] tracking-[3px] uppercase hover:bg-sepia transition-colors"
      >
        done
      </button>
    </div>
  );
}
