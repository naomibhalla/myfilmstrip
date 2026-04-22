// Composites processed images into a realistic film strip layout.
// Supports vertical or horizontal orientation, black or ivory film strip color,
// and per-photo crop (zoom + offset).

import { applyStyle, FilmStyle, loadImage } from "./imageProcessing";

export type Orientation = "vertical" | "horizontal";
export type BorderColor = "white" | "black";

export interface PhotoCrop {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface StripOptions {
  imageSrcs: string[];
  crops?: PhotoCrop[]; // optional per-photo crop (same length as imageSrcs)
  style: FilmStyle;
  orientation?: Orientation;
  borderColor?: BorderColor;
  frameWidth?: number;
  frameHeight?: number;
}

function filmColors(variant: BorderColor) {
  if (variant === "white") {
    return {
      filmBase: "#f0e6d2",
      innerBezel: "#e0d4be",
      perforationFill: "#8a7560",
      labelColor: "rgba(90, 70, 50, 0.55)",
    };
  }
  return {
    filmBase: "#1a1612",
    innerBezel: "#2a2420",
    perforationFill: "#f5f1e8",
    labelColor: "rgba(245, 241, 232, 0.4)",
  };
}

const DEFAULT_CROP: PhotoCrop = { zoom: 1, offsetX: 0, offsetY: 0 };

export async function generateFilmStrip(
  opts: StripOptions
): Promise<HTMLCanvasElement> {
  const orientation = opts.orientation ?? "vertical";
  const borderColor = opts.borderColor ?? "black";

  return orientation === "vertical"
    ? generateVerticalStrip(opts, borderColor)
    : generateHorizontalStrip(opts, borderColor);
}

// ========== VERTICAL STRIP ==========

async function generateVerticalStrip(
  opts: StripOptions,
  variant: BorderColor
): Promise<HTMLCanvasElement> {
  const frameWidth = opts.frameWidth ?? 600;
  const frameHeight = opts.frameHeight ?? 450;

  const sideMargin = 50;
  const topBottomMargin = 26;
  const gap = 10;
  const cornerRadius = 4;

  const colors = filmColors(variant);

  const stripWidth = frameWidth + sideMargin * 2;
  const stripHeight =
    opts.imageSrcs.length * frameHeight +
    (opts.imageSrcs.length - 1) * gap +
    topBottomMargin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colors.filmBase;
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  const noiseImg = ctx.getImageData(0, 0, stripWidth, stripHeight);
  const nd = noiseImg.data;
  const noiseStrength = variant === "white" ? 5 : 8;
  for (let i = 0; i < nd.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseStrength;
    nd[i] = Math.max(0, Math.min(255, nd[i] + n));
    nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + n));
    nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + n));
  }
  ctx.putImageData(noiseImg, 0, 0);

  const loaded = await Promise.all(opts.imageSrcs.map((s) => loadImage(s)));

  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    const crop = opts.crops?.[i] ?? DEFAULT_CROP;
    const y = topBottomMargin + i * (frameHeight + gap);
    const x = sideMargin;

    const processed = await applyStyleCoverFit(
      img,
      opts.style,
      frameWidth,
      frameHeight,
      crop
    );

    ctx.fillStyle = colors.innerBezel;
    ctx.fillRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

    ctx.save();
    roundedRectPath(ctx, x, y, frameWidth, frameHeight, cornerRadius);
    ctx.clip();
    ctx.drawImage(processed, x, y);
    ctx.restore();
  }

  drawVerticalPerforations(ctx, stripWidth, stripHeight, sideMargin, colors.perforationFill);
  drawVerticalFilmLabels(ctx, stripWidth, stripHeight, opts.style, colors.labelColor);

  return canvas;
}

// ========== HORIZONTAL STRIP ==========

async function generateHorizontalStrip(
  opts: StripOptions,
  variant: BorderColor
): Promise<HTMLCanvasElement> {
  const frameWidth = opts.frameWidth ?? 450;
  const frameHeight = opts.frameHeight ?? 600;

  const topBottomMargin = 50;
  const leftRightMargin = 26;
  const gap = 10;
  const cornerRadius = 4;

  const colors = filmColors(variant);

  const stripHeight = frameHeight + topBottomMargin * 2;
  const stripWidth =
    opts.imageSrcs.length * frameWidth +
    (opts.imageSrcs.length - 1) * gap +
    leftRightMargin * 2;

  const canvas = document.createElement("canvas");
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colors.filmBase;
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  const noiseImg = ctx.getImageData(0, 0, stripWidth, stripHeight);
  const nd = noiseImg.data;
  const noiseStrength = variant === "white" ? 5 : 8;
  for (let i = 0; i < nd.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseStrength;
    nd[i] = Math.max(0, Math.min(255, nd[i] + n));
    nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + n));
    nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + n));
  }
  ctx.putImageData(noiseImg, 0, 0);

  const loaded = await Promise.all(opts.imageSrcs.map((s) => loadImage(s)));

  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    const crop = opts.crops?.[i] ?? DEFAULT_CROP;
    const x = leftRightMargin + i * (frameWidth + gap);
    const y = topBottomMargin;

    const processed = await applyStyleCoverFit(
      img,
      opts.style,
      frameWidth,
      frameHeight,
      crop
    );

    ctx.fillStyle = colors.innerBezel;
    ctx.fillRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

    ctx.save();
    roundedRectPath(ctx, x, y, frameWidth, frameHeight, cornerRadius);
    ctx.clip();
    ctx.drawImage(processed, x, y);
    ctx.restore();
  }

  drawHorizontalPerforations(ctx, stripWidth, stripHeight, topBottomMargin, colors.perforationFill);
  drawHorizontalFilmLabels(ctx, stripWidth, stripHeight, opts.style, colors.labelColor);

  return canvas;
}

// ========== COVER FIT WITH CROP ==========
// Applies zoom + offset to mirror what the user saw in the crop editor.

async function applyStyleCoverFit(
  img: HTMLImageElement,
  style: FilmStyle,
  w: number,
  h: number,
  crop: PhotoCrop
): Promise<HTMLCanvasElement> {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const cctx = cropCanvas.getContext("2d")!;

  // 1. First compute the base "cover" source rect (what fills the frame at zoom=1, offset=0)
  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let baseSw = img.width;
  let baseSh = img.height;

  if (imgRatio > frameRatio) {
    // image wider than frame — crop sides
    baseSw = img.height * frameRatio;
  } else {
    // image taller than frame — crop top/bottom
    baseSh = img.width / frameRatio;
  }

  // 2. Apply zoom — shrink source rect proportionally (higher zoom = smaller source area)
  const sw = baseSw / crop.zoom;
  const sh = baseSh / crop.zoom;

  // 3. Apply offset — shift source rect within the image
  // In the UI, offsetX > 0 means user dragged image LEFT (revealing more of RIGHT side)
  // So the source rect's center should shift RIGHT by that amount
  const imgCenterX = img.width / 2;
  const imgCenterY = img.height / 2;

  // Convert offset percentage to pixels relative to base cover area
  const offsetPxX = (crop.offsetX / 100) * baseSw;
  const offsetPxY = (crop.offsetY / 100) * baseSh;

  let sx = imgCenterX - sw / 2 + offsetPxX;
  let sy = imgCenterY - sh / 2 + offsetPxY;

  // Clamp so we don't read outside the image
  sx = Math.max(0, Math.min(img.width - sw, sx));
  sy = Math.max(0, Math.min(img.height - sh, sy));

  cctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

  const dataUrl = cropCanvas.toDataURL("image/png");
  const wrapped = await loadImage(dataUrl);
  return applyStyle(wrapped, style, w, h);
}

// ========== HELPERS ==========

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawVerticalPerforations(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  sideMargin: number,
  fillColor: string
) {
  const holeW = 22;
  const holeH = 14;
  const holeSpacing = 26;
  const leftCenterX = sideMargin / 2;
  const rightCenterX = stripW - sideMargin / 2;

  const totalHoles = Math.floor(stripH / holeSpacing);
  const offsetY = (stripH - (totalHoles - 1) * holeSpacing) / 2;

  ctx.fillStyle = fillColor;
  for (let i = 0; i < totalHoles; i++) {
    const cy = offsetY + i * holeSpacing;
    roundedRectPath(ctx, leftCenterX - holeW / 2, cy - holeH / 2, holeW, holeH, 2);
    ctx.fill();
    roundedRectPath(ctx, rightCenterX - holeW / 2, cy - holeH / 2, holeW, holeH, 2);
    ctx.fill();
  }
}

function drawHorizontalPerforations(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  topBottomMargin: number,
  fillColor: string
) {
  const holeW = 14;
  const holeH = 22;
  const holeSpacing = 26;
  const topCenterY = topBottomMargin / 2;
  const bottomCenterY = stripH - topBottomMargin / 2;

  const totalHoles = Math.floor(stripW / holeSpacing);
  const offsetX = (stripW - (totalHoles - 1) * holeSpacing) / 2;

  ctx.fillStyle = fillColor;
  for (let i = 0; i < totalHoles; i++) {
    const cx = offsetX + i * holeSpacing;
    roundedRectPath(ctx, cx - holeW / 2, topCenterY - holeH / 2, holeW, holeH, 2);
    ctx.fill();
    roundedRectPath(ctx, cx - holeW / 2, bottomCenterY - holeH / 2, holeW, holeH, 2);
    ctx.fill();
  }
}

function drawVerticalFilmLabels(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  style: FilmStyle,
  labelColor: string
) {
  ctx.save();
  ctx.fillStyle = labelColor;
  ctx.font = "bold 9px 'Courier New', monospace";

  const labels: Record<FilmStyle, string> = {
    "classic-bw": "ILFORD HP5 400",
    "warm-vintage": "KODAK GOLD 200",
    "film-camera": "CINESTILL 800T",
  };

  ctx.save();
  ctx.translate(8, 22);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(labels[style], -30, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(stripW - 8, stripH - 22);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("• MYFILMSTRIP •", -80, 0);
  ctx.restore();

  ctx.restore();
}

function drawHorizontalFilmLabels(
  ctx: CanvasRenderingContext2D,
  stripW: number,
  stripH: number,
  style: FilmStyle,
  labelColor: string
) {
  ctx.save();
  ctx.fillStyle = labelColor;
  ctx.font = "bold 9px 'Courier New', monospace";

  const labels: Record<FilmStyle, string> = {
    "classic-bw": "ILFORD HP5 400",
    "warm-vintage": "KODAK GOLD 200",
    "film-camera": "CINESTILL 800T",
  };

  ctx.fillText(labels[style], 10, 14);
  ctx.fillText("• MYFILMSTRIP •", stripW - 100, stripH - 6);

  ctx.restore();
}
