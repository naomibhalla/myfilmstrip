// Composites processed images into a realistic film strip layout.
// Supports vertical or horizontal orientation, and black or white outer border.

import { applyStyle, FilmStyle, loadImage } from "./imageProcessing";

export type Orientation = "vertical" | "horizontal";
export type BorderColor = "white" | "black";

export interface StripOptions {
  imageSrcs: string[];
  style: FilmStyle;
  orientation?: Orientation;
  borderColor?: BorderColor;
  frameWidth?: number;
  frameHeight?: number;
}

export async function generateFilmStrip(
  opts: StripOptions
): Promise<HTMLCanvasElement> {
  const orientation = opts.orientation ?? "vertical";
  const borderColor = opts.borderColor ?? "white";

  return orientation === "vertical"
    ? generateVerticalStrip(opts, borderColor)
    : generateHorizontalStrip(opts, borderColor);
}

// ========== VERTICAL STRIP (original — frames stacked top to bottom) ==========

async function generateVerticalStrip(
  opts: StripOptions,
  borderColor: BorderColor
): Promise<HTMLCanvasElement> {
  const frameWidth = opts.frameWidth ?? 600;
  const frameHeight = opts.frameHeight ?? 450;

  const sideMargin = 80;
  const topBottomMargin = 50;
  const gap = 14;
  const cornerRadius = 4;
  const outerBorder = 24; // new: white/black border around the whole strip

  const innerStripWidth = frameWidth + sideMargin * 2;
  const innerStripHeight =
    opts.imageSrcs.length * frameHeight +
    (opts.imageSrcs.length - 1) * gap +
    topBottomMargin * 2;

  const canvasWidth = innerStripWidth + outerBorder * 2;
  const canvasHeight = innerStripHeight + outerBorder * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  // Outer border background
  ctx.fillStyle = borderColor === "white" ? "#fdfaf2" : "#0d0b09";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Inner film base (offset by outerBorder)
  const offX = outerBorder;
  const offY = outerBorder;
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(offX, offY, innerStripWidth, innerStripHeight);

  // Subtle film base texture
  const noiseImg = ctx.getImageData(offX, offY, innerStripWidth, innerStripHeight);
  const nd = noiseImg.data;
  for (let i = 0; i < nd.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    nd[i] = Math.max(0, Math.min(255, nd[i] + n));
    nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + n));
    nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + n));
  }
  ctx.putImageData(noiseImg, offX, offY);

  // Load + process all images
  const loaded = await Promise.all(opts.imageSrcs.map((s) => loadImage(s)));

  // Draw each frame
  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    const y = offY + topBottomMargin + i * (frameHeight + gap);
    const x = offX + sideMargin;

    const processed = await applyStyleCoverFit(
      img,
      opts.style,
      frameWidth,
      frameHeight
    );

    ctx.fillStyle = "#2a2420";
    ctx.fillRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

    ctx.save();
    roundedRectPath(ctx, x, y, frameWidth, frameHeight, cornerRadius);
    ctx.clip();
    ctx.drawImage(processed, x, y);
    ctx.restore();
  }

  // Perforations (inside the inner film, not on the outer border)
  drawVerticalPerforations(ctx, offX, offY, innerStripWidth, innerStripHeight, sideMargin);

  // Film labels
  drawVerticalFilmLabels(ctx, offX, offY, innerStripWidth, innerStripHeight, opts.style);

  return canvas;
}

// ========== HORIZONTAL STRIP (new — frames side by side) ==========

async function generateHorizontalStrip(
  opts: StripOptions,
  borderColor: BorderColor
): Promise<HTMLCanvasElement> {
  const frameWidth = opts.frameWidth ?? 450;
  const frameHeight = opts.frameHeight ?? 600;

  const topBottomMargin = 80; // space for perforations (top + bottom)
  const leftRightMargin = 50;
  const gap = 14;
  const cornerRadius = 4;
  const outerBorder = 24;

  const innerStripHeight = frameHeight + topBottomMargin * 2;
  const innerStripWidth =
    opts.imageSrcs.length * frameWidth +
    (opts.imageSrcs.length - 1) * gap +
    leftRightMargin * 2;

  const canvasWidth = innerStripWidth + outerBorder * 2;
  const canvasHeight = innerStripHeight + outerBorder * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d")!;

  // Outer border
  ctx.fillStyle = borderColor === "white" ? "#fdfaf2" : "#0d0b09";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Inner film base
  const offX = outerBorder;
  const offY = outerBorder;
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(offX, offY, innerStripWidth, innerStripHeight);

  // Film base texture
  const noiseImg = ctx.getImageData(offX, offY, innerStripWidth, innerStripHeight);
  const nd = noiseImg.data;
  for (let i = 0; i < nd.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    nd[i] = Math.max(0, Math.min(255, nd[i] + n));
    nd[i + 1] = Math.max(0, Math.min(255, nd[i + 1] + n));
    nd[i + 2] = Math.max(0, Math.min(255, nd[i + 2] + n));
  }
  ctx.putImageData(noiseImg, offX, offY);

  const loaded = await Promise.all(opts.imageSrcs.map((s) => loadImage(s)));

  // Draw each frame horizontally
  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    const x = offX + leftRightMargin + i * (frameWidth + gap);
    const y = offY + topBottomMargin;

    const processed = await applyStyleCoverFit(
      img,
      opts.style,
      frameWidth,
      frameHeight
    );

    ctx.fillStyle = "#2a2420";
    ctx.fillRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

    ctx.save();
    roundedRectPath(ctx, x, y, frameWidth, frameHeight, cornerRadius);
    ctx.clip();
    ctx.drawImage(processed, x, y);
    ctx.restore();
  }

  // Perforations on top and bottom
  drawHorizontalPerforations(
    ctx,
    offX,
    offY,
    innerStripWidth,
    innerStripHeight,
    topBottomMargin
  );

  // Film labels
  drawHorizontalFilmLabels(ctx, offX, offY, innerStripWidth, innerStripHeight, opts.style);

  return canvas;
}

// ========== COVER FIT ==========

async function applyStyleCoverFit(
  img: HTMLImageElement,
  style: FilmStyle,
  w: number,
  h: number
): Promise<HTMLCanvasElement> {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = w;
  cropCanvas.height = h;
  const cctx = cropCanvas.getContext("2d")!;

  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (imgRatio > frameRatio) {
    sw = img.height * frameRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / frameRatio;
    sy = (img.height - sh) / 2;
  }

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
  offX: number,
  offY: number,
  stripW: number,
  stripH: number,
  sideMargin: number
) {
  const holeW = 28;
  const holeH = 18;
  const holeSpacing = 32;
  const leftCenterX = offX + sideMargin / 2;
  const rightCenterX = offX + stripW - sideMargin / 2;

  const totalHoles = Math.floor(stripH / holeSpacing);
  const offsetY = offY + (stripH - (totalHoles - 1) * holeSpacing) / 2;

  ctx.fillStyle = "#f5f1e8";
  for (let i = 0; i < totalHoles; i++) {
    const cy = offsetY + i * holeSpacing;
    roundedRectPath(ctx, leftCenterX - holeW / 2, cy - holeH / 2, holeW, holeH, 3);
    ctx.fill();
    roundedRectPath(ctx, rightCenterX - holeW / 2, cy - holeH / 2, holeW, holeH, 3);
    ctx.fill();
  }
}

function drawHorizontalPerforations(
  ctx: CanvasRenderingContext2D,
  offX: number,
  offY: number,
  stripW: number,
  stripH: number,
  topBottomMargin: number
) {
  const holeW = 18;
  const holeH = 28;
  const holeSpacing = 32;
  const topCenterY = offY + topBottomMargin / 2;
  const bottomCenterY = offY + stripH - topBottomMargin / 2;

  const totalHoles = Math.floor(stripW / holeSpacing);
  const offsetX = offX + (stripW - (totalHoles - 1) * holeSpacing) / 2;

  ctx.fillStyle = "#f5f1e8";
  for (let i = 0; i < totalHoles; i++) {
    const cx = offsetX + i * holeSpacing;
    roundedRectPath(ctx, cx - holeW / 2, topCenterY - holeH / 2, holeW, holeH, 3);
    ctx.fill();
    roundedRectPath(ctx, cx - holeW / 2, bottomCenterY - holeH / 2, holeW, holeH, 3);
    ctx.fill();
  }
}

function drawVerticalFilmLabels(
  ctx: CanvasRenderingContext2D,
  offX: number,
  offY: number,
  stripW: number,
  stripH: number,
  style: FilmStyle
) {
  ctx.save();
  ctx.fillStyle = "rgba(245, 241, 232, 0.4)";
  ctx.font = "bold 10px 'Courier New', monospace";

  const labels: Record<FilmStyle, string> = {
    "classic-bw": "ILFORD HP5 400",
    "warm-vintage": "KODAK GOLD 200",
    "film-camera": "CINESTILL 800T",
  };

  ctx.save();
  ctx.translate(offX + 12, offY + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(labels[style], -30, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(offX + stripW - 12, offY + stripH - 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("• MYFILMSTRIP •", -80, 0);
  ctx.restore();

  ctx.restore();
}

function drawHorizontalFilmLabels(
  ctx: CanvasRenderingContext2D,
  offX: number,
  offY: number,
  stripW: number,
  stripH: number,
  style: FilmStyle
) {
  ctx.save();
  ctx.fillStyle = "rgba(245, 241, 232, 0.4)";
  ctx.font = "bold 10px 'Courier New', monospace";

  const labels: Record<FilmStyle, string> = {
    "classic-bw": "ILFORD HP5 400",
    "warm-vintage": "KODAK GOLD 200",
    "film-camera": "CINESTILL 800T",
  };

  // Top-left film label
  ctx.fillText(labels[style], offX + 12, offY + 18);
  // Bottom-right
  ctx.fillText("• MYFILMSTRIP •", offX + stripW - 100, offY + stripH - 8);

  ctx.restore();
}
