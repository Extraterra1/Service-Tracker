export const A4_SIZE_MM = Object.freeze({ width: 210, height: 297 });
export const WHATSAPP_NUMBER = '+351927491323';

export const KEYRING_PDF_LAYOUT = Object.freeze({
  strip: Object.freeze({ x: 20.7, top: 24.8, width: 167.5, height: 28.4 }),
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
