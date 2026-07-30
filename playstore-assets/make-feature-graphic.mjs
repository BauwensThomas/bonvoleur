import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const W = 1024;
const H = 500;

const heroPath = path.join(__dirname, "hero-source.webp");
const logoPath = path.join(__dirname, "..", "assets", "plane-mark-white.png");
const outPath = path.join(__dirname, "feature-graphic-1024x500.png");

const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000000" flood-opacity="0.85"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <text x="150" y="235" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#ffffff">BonVoleur</text>
    <text x="150" y="290" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="400" fill="#ffffff">Vole plus loin, paye moins.</text>
    <text x="150" y="335" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="400" fill="#ffffff">Bons plans vols + alertes email et push</text>
  </g>
</svg>`;

const hero = await sharp(heroPath)
  .resize(W, H, { fit: "cover" })
  .toBuffer();

const logo = await sharp(logoPath)
  .resize({ height: 90 })
  .toBuffer();

await sharp(hero)
  .composite([
    { input: logo, top: 60, left: 150 },
    { input: await sharp(Buffer.from(textSvg)).png().toBuffer(), top: 0, left: 0 },
  ])
  .png()
  .toFile(outPath);

console.log("OK ->", outPath);
