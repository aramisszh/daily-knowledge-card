import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const cardsFile = path.join(projectRoot, "data", "cards.json");
const outputDir = path.join(projectRoot, "public", "generated-cards");

const palettes = [
  { accent: "#234a78", accentSoft: "#d9e8ff", panel: "#f7fbff", ink: "#0f172a" },
  { accent: "#7c3d12", accentSoft: "#ffedd8", panel: "#fffaf4", ink: "#172033" },
  { accent: "#0f766e", accentSoft: "#d5fbf6", panel: "#f4fffd", ink: "#132238" },
  { accent: "#6d28d9", accentSoft: "#ede4ff", panel: "#faf7ff", ink: "#191733" },
  { accent: "#0f766e", accentSoft: "#d8fff2", panel: "#f6fffb", ink: "#10243c" },
  { accent: "#1d4ed8", accentSoft: "#ddeafe", panel: "#f8fbff", ink: "#132033" },
  { accent: "#be123c", accentSoft: "#ffe0ea", panel: "#fff7fa", ink: "#1a1c34" },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wrapText(value, maxChars, maxLines) {
  const text = normalizeText(value);
  if (!text) return [];

  const lines = [];
  let current = "";

  for (const char of [...text]) {
    if (char === "\n") {
      if (current) lines.push(current);
      current = "";
      continue;
    }

    if (current.length >= maxChars) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if ([...text].length > lines.join("").length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(0, maxChars - 1))}…`;
  }

  return lines;
}

function renderTextLines(lines, options) {
  const {
    x,
    y,
    lineHeight,
    fontSize,
    fill,
    fontWeight = 400,
    opacity = 1,
  } = options;

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" opacity="${opacity}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">${escapeXml(line)}</text>`
    )
    .join("");
}

function renderBulletList(items, options) {
  const { x, y, width, lineHeight, fill, bulletFill, fontSize } = options;
  let currentY = y;

  const parts = items.flatMap((item) => {
    const lines = wrapText(item, Math.max(12, Math.floor(width / fontSize) - 3), 2);
    const bullet = `<circle cx="${x}" cy="${currentY - 6}" r="5" fill="${bulletFill}" />`;
    const text = renderTextLines(lines, {
      x: x + 18,
      y: currentY,
      lineHeight,
      fontSize,
      fill,
    });
    currentY += lines.length * lineHeight + 14;
    return [bullet, text];
  });

  return { markup: parts.join(""), nextY: currentY };
}

function renderKeywordChips(keywords, options) {
  const { x, y, maxWidth, accent, accentSoft } = options;
  let cursorX = x;
  let cursorY = y;
  const lineHeight = 48;
  const gap = 12;

  const chips = keywords
    .slice(0, 5)
    .map((keyword) => normalizeText(keyword))
    .filter(Boolean)
    .map((keyword) => {
      const width = Math.max(96, Math.min(220, keyword.length * 18 + 34));
      if (cursorX + width > x + maxWidth) {
        cursorX = x;
        cursorY += lineHeight + gap;
      }

      const markup = `
        <rect x="${cursorX}" y="${cursorY}" rx="20" ry="20" width="${width}" height="${lineHeight}" fill="${accentSoft}" />
        <text x="${cursorX + 18}" y="${cursorY + 31}" font-size="22" font-weight="600" fill="${accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">${escapeXml(keyword)}</text>
      `;

      cursorX += width + gap;
      return markup;
    })
    .join("");

  return { markup: chips, nextY: cursorY + lineHeight };
}

function renderCard(card, palette, index) {
  const width = 1200;
  const height = 1500;
  const margin = 72;
  const columnGap = 40;
  const leftWidth = 670;
  const rightX = margin + leftWidth + columnGap;
  const rightWidth = width - margin - rightX;

  const keywords = Array.isArray(card.keywords) ? card.keywords : [];
  const whyImportant = Array.isArray(card.content?.whyImportant) ? card.content.whyImportant : [];
  const hooks = Array.isArray(card.content?.memoryHooks) ? card.content.memoryHooks : [];

  const titleLines = wrapText(card.title, 15, 3);
  const subtitleLines = wrapText(card.subtitle, 22, 2);
  const summaryLines = wrapText(card.summary, 26, 5);
  const coreLines = wrapText(card.content?.coreMechanism, 26, 6);
  const financeLines = wrapText(card.content?.financeAngle, 26, 5);
  const conclusionLines = wrapText(card.content?.conclusion, 26, 4);

  const keywordBlock = renderKeywordChips(keywords, {
    x: margin,
    y: 604,
    maxWidth: leftWidth,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
  });

  const whyBlock = renderBulletList(whyImportant.slice(0, 3), {
    x: margin,
    y: 774,
    width: leftWidth,
    lineHeight: 32,
    fontSize: 24,
    fill: "#334155",
    bulletFill: palette.accent,
  });

  const hookBlock = renderBulletList(hooks.slice(0, 2), {
    x: rightX,
    y: 1116,
    width: rightWidth,
    lineHeight: 32,
    fontSize: 24,
    fill: "#334155",
    bulletFill: palette.accent,
  });

  const headerLabel = `${card.category} · ${card.subCategory} · ${card.difficulty}`;
  const posterTitle = `${String(index + 1).padStart(2, "0")} / 07`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg-${index}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.panel}" />
      <stop offset="60%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="${palette.accentSoft}" />
    </linearGradient>
    <linearGradient id="accent-${index}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.accent}" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg-${index})" />
  <circle cx="${width - 80}" cy="96" r="180" fill="${palette.accentSoft}" opacity="0.65" />
  <circle cx="90" cy="${height - 140}" r="220" fill="${palette.accentSoft}" opacity="0.5" />
  <rect x="${margin}" y="${margin}" rx="32" ry="32" width="${width - margin * 2}" height="${height - margin * 2}" fill="#ffffff" opacity="0.88" />

  <rect x="${margin}" y="${margin}" rx="32" ry="32" width="14" height="${height - margin * 2}" fill="url(#accent-${index})" />

  <rect x="${margin + 28}" y="${margin + 8}" rx="24" ry="24" width="360" height="48" fill="${palette.accentSoft}" />
  <text x="${margin + 52}" y="${margin + 40}" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">${escapeXml(headerLabel)}</text>
  <text x="${width - margin - 180}" y="${margin + 40}" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Georgia, Times New Roman, serif">${posterTitle}</text>

  ${renderTextLines(titleLines, { x: margin, y: 176, lineHeight: 78, fontSize: 62, fill: palette.ink, fontWeight: 800 })}
  ${renderTextLines(subtitleLines, { x: margin, y: 392, lineHeight: 40, fontSize: 30, fill: "#475569", fontWeight: 500 })}

  <rect x="${margin}" y="470" rx="24" ry="24" width="${leftWidth}" height="108" fill="${palette.accentSoft}" />
  <text x="${margin + 28}" y="510" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">今日要点</text>
  ${renderTextLines(summaryLines, { x: margin + 28, y: 548, lineHeight: 28, fontSize: 22, fill: "#334155" })}

  <text x="${margin}" y="646" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">关键词</text>
  ${keywordBlock.markup}

  <text x="${margin}" y="736" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">为什么重要</text>
  ${whyBlock.markup}

  <rect x="${rightX}" y="176" rx="28" ry="28" width="${rightWidth}" height="420" fill="#0f172a" />
  <text x="${rightX + 28}" y="224" font-size="24" font-weight="700" fill="#cbd5e1" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">核心机制</text>
  ${renderTextLines(coreLines, { x: rightX + 28, y: 270, lineHeight: 34, fontSize: 24, fill: "#f8fafc" })}

  <rect x="${rightX}" y="632" rx="28" ry="28" width="${rightWidth}" height="312" fill="${palette.panel}" stroke="${palette.accentSoft}" stroke-width="2" />
  <text x="${rightX + 28}" y="680" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">财务视角</text>
  ${renderTextLines(financeLines, { x: rightX + 28, y: 726, lineHeight: 34, fontSize: 24, fill: "#334155" })}

  <rect x="${margin}" y="1010" rx="28" ry="28" width="${leftWidth}" height="350" fill="#f8fafc" stroke="${palette.accentSoft}" stroke-width="2" />
  <text x="${margin + 28}" y="1060" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">结论</text>
  ${renderTextLines(conclusionLines, { x: margin + 28, y: 1110, lineHeight: 38, fontSize: 27, fill: palette.ink, fontWeight: 600 })}
  <text x="${margin + 28}" y="1268" font-size="21" font-weight="600" fill="#64748b" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">日期：${escapeXml(card.cardDate)}</text>

  <rect x="${rightX}" y="1010" rx="28" ry="28" width="${rightWidth}" height="350" fill="#ffffff" stroke="${palette.accentSoft}" stroke-width="2" />
  <text x="${rightX + 28}" y="1060" font-size="24" font-weight="700" fill="${palette.accent}" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">记忆钩子</text>
  ${hookBlock.markup}
  <text x="${rightX + 28}" y="1288" font-size="21" font-weight="600" fill="#64748b" font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">适合直接阅读，不再依赖页面叠字。</text>
</svg>`;
}

async function main() {
  const raw = await fs.readFile(cardsFile, "utf8");
  const cards = JSON.parse(raw);

  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all(
    cards.map(async (card, index) => {
      const svg = renderCard(card, palettes[index % palettes.length], index);
      const filePath = path.join(outputDir, `${card.id}.svg`);
      await fs.writeFile(filePath, svg, "utf8");
    })
  );

  console.log(`Generated ${cards.length} knowledge card posters in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
