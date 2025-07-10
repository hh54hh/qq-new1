// إنشاء أيقونات PWA بحجم صحيح
const fs = require("fs");

// إنشاء أيقونة PNG بسيطة بصيغة base64
function createIconData(size) {
  // أيقونة PNG بسيطة ملونة (مربع ذهبي مع رمز المقص)
  const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size / 8}" fill="#1f2937"/>
    <rect x="${size / 8}" y="${size / 8}" width="${(size * 3) / 4}" height="${(size * 3) / 4}" rx="${size / 16}" fill="#f59e0b"/>
    <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${size / 3}" fill="white">✂️</text>
  </svg>`;

  return canvas;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach((size) => {
  const svgContent = createIconData(size);
  fs.writeFileSync(`icons/icon-${size}x${size}.svg`, svgContent);
  console.log(`✅ Created icon-${size}x${size}.svg`);
});

console.log("🎉 أيقونات SVG تم إنشاؤها بنجاح!");
