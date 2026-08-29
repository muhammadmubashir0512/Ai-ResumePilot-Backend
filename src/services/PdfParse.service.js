import { PDFParse } from "pdf-parse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const PdfToText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const sanitizeText = (text) => {
  return text
    .replace(/●/g, "-")
    .replace(/•/g, "-")
    .replace(/▪/g, "-")
    .replace(/◦/g, "-")
    .replace(/✓/g, "OK")
    .replace(/→/g, "->")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/‘/g, "'")
    .replace(/’/g, "'");
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines;
};

const isHeading = (line) => {
  const trimmed = line.trim();

  if (!trimmed) return false;

  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);

  const isShort = trimmed.length < 40;

  return (isAllCaps && isShort) || trimmed.endsWith(":");
};

export const createResumePdf = async (resumeText) => {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BODY_SIZE = 11;
  const HEADING_SIZE = 13;
  const LINE_HEIGHT = 16;
  const HEADING_GAP_BEFORE = 10;
  const HEADING_GAP_AFTER = 4;

  const safeResumeText = sanitizeText(resumeText);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const addNewPageIfNeeded = (spaceNeeded) => {
    if (y - spaceNeeded < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const rawLines = safeResumeText.split("\n");

  for (const rawLine of rawLines) {
    const line = rawLine.trim();

    if (!line) {
      y -= LINE_HEIGHT / 2;
      continue;
    }

    if (isHeading(line)) {
      addNewPageIfNeeded(HEADING_GAP_BEFORE + LINE_HEIGHT + HEADING_GAP_AFTER);

      y -= HEADING_GAP_BEFORE;

      page.drawText(line, {
        x: MARGIN,
        y,
        size: HEADING_SIZE,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      y -= LINE_HEIGHT + HEADING_GAP_AFTER;

      continue;
    }

    const wrappedLines = wrapText(line, regularFont, BODY_SIZE, CONTENT_WIDTH);

    for (const wrapped of wrappedLines) {
      addNewPageIfNeeded(LINE_HEIGHT);

      page.drawText(wrapped, {
        x: MARGIN,
        y,
        size: BODY_SIZE,
        font: regularFont,
        color: rgb(0.13, 0.13, 0.13),
      });

      y -= LINE_HEIGHT;
    }
  }

  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
};
