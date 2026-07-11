export const A4_SIZE_MM = Object.freeze({ width: 210, height: 297 });
export const WHATSAPP_NUMBER = '+351927491323';
export const SORA_FONT_NAME = 'Sora SemiBold';

export const KEYRING_PDF_LAYOUT = Object.freeze({
  strip: Object.freeze({ x: 20.7, top: 24.8, width: 167.5, height: 28.4 }),
  logo: Object.freeze({ width: 34, zoneTop: 2.5, zoneHeight: 15.5 }),
  borderWidth: 0.2
});

export function mmToPoints(value) {
  return (Number(value) * 72) / 25.4;
}

function formatPlate(value) {
  const compactPlate = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!compactPlate) {
    throw new Error('Seleciona uma matrícula antes de gerar o PDF.');
  }

  return compactPlate.match(/.{1,2}/g).join('-');
}

export function buildKeyringPdfModel(plate) {
  const displayPlate = formatPlate(plate);
  const { strip } = KEYRING_PDF_LAYOUT;
  const cellWidth = strip.width / 4;
  const cells = Array.from({ length: 4 }, (_, index) => ({
    x: strip.x + cellWidth * index,
    top: strip.top,
    width: cellWidth,
    height: strip.height
  }));

  return {
    page: A4_SIZE_MM,
    strip,
    cells,
    dividers: cells.slice(1).map((cell) => cell.x),
    plates: [cells[0], cells[2]].map((cell) => ({ text: displayPlate, cell })),
    phones: [cells[1], cells[3]].map((cell) => ({ text: WHATSAPP_NUMBER, cell }))
  };
}

export function getKeyringPdfFilename(plate) {
  return `porta-chaves-${formatPlate(plate)}.pdf`;
}

function topToPdfY(top, height = 0) {
  return mmToPoints(A4_SIZE_MM.height - top - height);
}

function drawCenteredText(page, font, text, cell, top, size) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: mmToPoints(cell.x + cell.width / 2) - width / 2,
    y: topToPdfY(cell.top + top) - size,
    size,
    font
  });
}

export async function createKeyringPdfBytes(plate, { logoPngBytes, whatsappPngBytes, soraFontBytes } = {}) {
  if (!logoPngBytes || !whatsappPngBytes) {
    throw new Error('Não foi possível preparar os elementos gráficos do porta-chaves.');
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const model = buildKeyringPdfModel(plate);
  const document = await PDFDocument.create();
  const page = document.addPage([mmToPoints(A4_SIZE_MM.width), mmToPoints(A4_SIZE_MM.height)]);
  let printFont;
  if (soraFontBytes) {
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    document.registerFontkit(fontkit);
    printFont = await document.embedFont(soraFontBytes, { subset: true });
  } else {
    printFont = await document.embedFont(StandardFonts.HelveticaBold);
  }
  const [logo, whatsapp] = await Promise.all([document.embedPng(logoPngBytes), document.embedPng(whatsappPngBytes)]);
  const black = rgb(0, 0, 0);
  const { strip } = model;

  page.drawRectangle({
    x: mmToPoints(strip.x),
    y: topToPdfY(strip.top, strip.height),
    width: mmToPoints(strip.width),
    height: mmToPoints(strip.height),
    borderColor: black,
    borderWidth: mmToPoints(KEYRING_PDF_LAYOUT.borderWidth)
  });

  model.dividers.forEach((x) => {
    page.drawLine({
      start: { x: mmToPoints(x), y: topToPdfY(strip.top, strip.height) },
      end: { x: mmToPoints(x), y: topToPdfY(strip.top) },
      color: black,
      thickness: mmToPoints(KEYRING_PDF_LAYOUT.borderWidth)
    });
  });

  model.plates.forEach(({ text, cell }) => {
    const logoWidth = mmToPoints(KEYRING_PDF_LAYOUT.logo.width);
    const logoScale = logoWidth / logo.width;
    const logoHeight = logo.height * logoScale;
    const logoHeightMm = (logoHeight * 25.4) / 72;
    const logoTop = cell.top + KEYRING_PDF_LAYOUT.logo.zoneTop + (KEYRING_PDF_LAYOUT.logo.zoneHeight - logoHeightMm) / 2;
    page.drawImage(logo, {
      x: mmToPoints(cell.x + cell.width / 2) - logoWidth / 2,
      y: topToPdfY(logoTop) - logoHeight,
      width: logoWidth,
      height: logoHeight
    });
    drawCenteredText(page, printFont, text, cell, 20.1, 15.8);
  });

  model.phones.forEach(({ text, cell }) => {
    const iconSize = mmToPoints(10.7);
    page.drawImage(whatsapp, {
      x: mmToPoints(cell.x + cell.width / 2) - iconSize / 2,
      y: topToPdfY(cell.top + 4.1) - iconSize,
      width: iconSize,
      height: iconSize
    });
    drawCenteredText(page, printFont, text, cell, 20.3, 12.8);
  });

  return document.save({ useObjectStreams: false });
}

export function svgUrlToPngBytes(url, width = 1600) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const aspectRatio = image.naturalHeight / image.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.max(1, Math.round(width * aspectRatio));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('O navegador não conseguiu preparar o PDF.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('O navegador não conseguiu converter a imagem para impressão.'));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('Não foi possível carregar os elementos gráficos do PDF.'));
    image.src = url;
  });
}

export async function downloadKeyringPdf(plate) {
  const [logoPngBytes, whatsappPngBytes, soraFontBytes] = await Promise.all([
    svgUrlToPngBytes(logoUrl),
    svgUrlToPngBytes(whatsappUrl, 800),
    fetch(soraFontUrl).then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar a tipografia do PDF.');
      return response.arrayBuffer();
    })
  ]);
  const bytes = await createKeyringPdfBytes(plate, { logoPngBytes, whatsappPngBytes, soraFontBytes });
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = getKeyringPdfFilename(plate);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}
import logoUrl from '../../assets/Logo Base.svg';
import soraFontUrl from '../../assets/fonts/Sora-SemiBold.ttf?url';
import whatsappUrl from '../../assets/whatsapp.svg';
