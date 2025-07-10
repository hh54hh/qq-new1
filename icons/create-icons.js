// Script to create all required icon sizes
// This creates a modern barber scissors icon

function createIconCanvas(size) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = size;
  canvas.height = size;

  // Clear canvas with dark background
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, 0, size, size);

  // Calculate proportional sizes
  const scale = size / 512;
  const centerX = size / 2;
  const centerY = size / 2;

  // Draw rounded rectangle background
  const radius = size * 0.125; // 12.5% radius
  ctx.fillStyle =
    "linear-gradient(135deg, #1f2937 0%, #374151 50%, #111827 100%)";
  // Simulate gradient with multiple fills
  ctx.fillStyle = "#1f2937";
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fill();

  ctx.fillStyle = "#374151";
  roundRect(ctx, size * 0.1, size * 0.1, size * 0.8, size * 0.8, radius * 0.8);
  ctx.fill();

  // Draw scissors
  drawScissors(ctx, centerX, centerY, scale);

  return canvas;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawScissors(ctx, centerX, centerY, scale) {
  // Draw scissors handles (circles)
  const handleRadius = 28 * scale;
  const handleOffset = 60 * scale;
  const verticalOffset = 40 * scale;

  // White circles for handles
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.95;

  // Top left handle
  ctx.beginPath();
  ctx.arc(
    centerX - handleOffset,
    centerY - verticalOffset,
    handleRadius,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  // Bottom left handle
  ctx.beginPath();
  ctx.arc(
    centerX - handleOffset,
    centerY + verticalOffset,
    handleRadius,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  // Top right handle
  ctx.beginPath();
  ctx.arc(
    centerX + handleOffset,
    centerY - verticalOffset,
    handleRadius,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  // Bottom right handle
  ctx.beginPath();
  ctx.arc(
    centerX + handleOffset,
    centerY + verticalOffset,
    handleRadius,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  ctx.globalAlpha = 1.0;

  // Draw scissors blades
  ctx.fillStyle = "#fbbf24";
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2 * scale;

  ctx.beginPath();
  // Simplified scissors blade shape
  ctx.moveTo(centerX - 88 * scale, centerY - verticalOffset);
  ctx.lineTo(centerX + 20 * scale, centerY - 8 * scale);
  ctx.lineTo(centerX + 20 * scale, centerY + 8 * scale);
  ctx.lineTo(centerX - 88 * scale, centerY + verticalOffset);
  ctx.lineTo(centerX - handleOffset, centerY + verticalOffset);
  ctx.lineTo(centerX + 40 * scale, centerY + 8 * scale);
  ctx.lineTo(centerX + 80 * scale, centerY + 12 * scale);
  ctx.lineTo(centerX + 80 * scale, centerY - 12 * scale);
  ctx.lineTo(centerX + 40 * scale, centerY - 8 * scale);
  ctx.lineTo(centerX - handleOffset, centerY - verticalOffset);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center screw
  ctx.fillStyle = "#e5e7eb";
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8 * scale, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4 * scale, 0, 2 * Math.PI);
  ctx.fill();

  // Decorative golden circles on handles
  ctx.fillStyle = "#f59e0b";
  ctx.globalAlpha = 0.8;

  ctx.beginPath();
  ctx.arc(
    centerX - handleOffset,
    centerY - verticalOffset,
    12 * scale,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    centerX - handleOffset,
    centerY + verticalOffset,
    12 * scale,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    centerX + handleOffset,
    centerY - verticalOffset,
    12 * scale,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    centerX + handleOffset,
    centerY + verticalOffset,
    12 * scale,
    0,
    2 * Math.PI,
  );
  ctx.fill();

  ctx.globalAlpha = 1.0;

  // Hair cutting effect lines
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2 * scale;
  ctx.globalAlpha = 0.6;

  // Horizontal cutting lines
  ctx.beginPath();
  ctx.moveTo(centerX + 90 * scale, centerY - 3 * scale);
  ctx.lineTo(centerX + 130 * scale, centerY - 3 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX + 95 * scale, centerY - 12 * scale);
  ctx.lineTo(centerX + 125 * scale, centerY - 12 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX + 90 * scale, centerY + 8 * scale);
  ctx.lineTo(centerX + 125 * scale, centerY + 8 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX + 100 * scale, centerY + 15 * scale);
  ctx.lineTo(centerX + 125 * scale, centerY + 15 * scale);
  ctx.stroke();

  ctx.globalAlpha = 1.0;
}

// Usage example
if (typeof document !== "undefined") {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  sizes.forEach((size) => {
    const canvas = createIconCanvas(size);
    const dataUrl = canvas.toDataURL("image/png");

    // Create download link
    const link = document.createElement("a");
    link.download = `icon-${size}x${size}.png`;
    link.href = dataUrl;
    link.textContent = `Download ${size}x${size}`;
    link.style.display = "block";
    link.style.margin = "5px 0";
    document.body.appendChild(link);

    // Create preview
    const img = document.createElement("img");
    img.src = dataUrl;
    img.style.width = Math.min(size, 64) + "px";
    img.style.height = Math.min(size, 64) + "px";
    img.style.margin = "5px";
    img.style.border = "1px solid #ccc";
    document.body.appendChild(img);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createIconCanvas };
}
