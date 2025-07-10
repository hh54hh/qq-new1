#!/usr/bin/env node

// Generate PWA icons for the Barber app
const fs = require("fs");
const path = require("path");

// Create Canvas API polyfill for Node.js
const { createCanvas } = require("canvas");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background with rounded corners effect
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#1f2937");
  gradient.addColorStop(0.5, "#374151");
  gradient.addColorStop(1, "#111827");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Scale factor
  const s = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  // Draw scissors icon
  drawScissorsIcon(ctx, cx, cy, s);

  return canvas;
}

function drawScissorsIcon(ctx, cx, cy, scale) {
  // Scissors handles
  const handleR = 28 * scale;
  const handleDist = 60 * scale;
  const vertDist = 40 * scale;

  // White handle circles
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";

  // Four handle circles
  ctx.beginPath();
  ctx.arc(cx - handleDist, cy - vertDist, handleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - handleDist, cy + vertDist, handleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + handleDist, cy - vertDist, handleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + handleDist, cy + vertDist, handleR, 0, Math.PI * 2);
  ctx.fill();

  // Scissors blades - simplified X shape
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = "round";

  // X-shaped scissors
  ctx.beginPath();
  ctx.moveTo(cx - 80 * scale, cy - 80 * scale);
  ctx.lineTo(cx + 80 * scale, cy + 80 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 80 * scale, cy - 80 * scale);
  ctx.lineTo(cx - 80 * scale, cy + 80 * scale);
  ctx.stroke();

  // Center circle
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(cx, cy, 12 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Golden circles on handles
  ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
  const smallR = 12 * scale;

  ctx.beginPath();
  ctx.arc(cx - handleDist, cy - vertDist, smallR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - handleDist, cy + vertDist, smallR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + handleDist, cy - vertDist, smallR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx + handleDist, cy + vertDist, smallR, 0, Math.PI * 2);
  ctx.fill();

  // Hair cutting lines
  ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
  ctx.lineWidth = 3 * scale;

  for (let i = 0; i < 4; i++) {
    const y = cy - 20 * scale + i * 15 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 90 * scale, y);
    ctx.lineTo(cx + 130 * scale, y);
    ctx.stroke();
  }
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate all icon sizes
sizes.forEach((size) => {
  const canvas = createIcon(size);
  const buffer = canvas.toBuffer("image/png");
  const filename = path.join(iconsDir, `icon-${size}x${size}.png`);

  fs.writeFileSync(filename, buffer);
  console.log(`✅ Generated ${filename}`);
});

console.log("🚀 All icons generated successfully!");
