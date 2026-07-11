import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  A4_SIZE_MM,
  KEYRING_PDF_LAYOUT,
  SORA_FONT_NAME,
  WHATSAPP_NUMBER,
  buildKeyringPdfModel,
  createKeyringPdfBytes,
  getKeyringPdfFilename,
  mmToPoints
} from '../keyringPdf';

describe('keyring PDF specification', () => {
  it('uses an A4 page and preserves the measured reference strip', () => {
    expect(A4_SIZE_MM).toEqual({ width: 210, height: 297 });
    expect(KEYRING_PDF_LAYOUT.strip).toEqual({ x: 20.7, top: 24.8, width: 167.5, height: 28.4 });
    expect(mmToPoints(210)).toBeCloseTo(595.28, 1);
    expect(mmToPoints(297)).toBeCloseTo(841.89, 1);
  });

  it('uses a larger logo centered in the upper artwork zone and Sora typography', () => {
    expect(KEYRING_PDF_LAYOUT.logo.width).toBe(34);
    expect(KEYRING_PDF_LAYOUT.logo.zoneTop).toBe(2.5);
    expect(KEYRING_PDF_LAYOUT.logo.zoneHeight).toBe(15.5);
    expect(SORA_FONT_NAME).toBe('Sora SemiBold');
  });

  it('builds four equal cells with three internal dividers', () => {
    const model = buildKeyringPdfModel('BF-07-JZ');

    expect(model.cells).toHaveLength(4);
    expect(model.dividers).toHaveLength(3);
    expect(model.cells.every((cell) => cell.width === KEYRING_PDF_LAYOUT.strip.width / 4)).toBe(true);
  });

  it('duplicates the selected plate and fixed WhatsApp number', () => {
    const model = buildKeyringPdfModel(' bf 07 jz ');

    expect(model.plates.map((item) => item.text)).toEqual(['BF-07-JZ', 'BF-07-JZ']);
    expect(model.phones.map((item) => item.text)).toEqual([WHATSAPP_NUMBER, WHATSAPP_NUMBER]);
    expect(WHATSAPP_NUMBER).toBe('+351927491323');
  });

  it('rejects empty plates and creates a stable filename', () => {
    expect(() => buildKeyringPdfModel('  ')).toThrow('Seleciona uma matrícula');
    expect(getKeyringPdfFilename('BF 07 JZ')).toBe('porta-chaves-BF-07-JZ.pdf');
  });

  it('creates a single exact-size A4 PDF using both supplied artworks', async () => {
    const pixel = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const bytes = await createKeyringPdfBytes('BF-07-JZ', {
      logoPngBytes: pixel,
      whatsappPngBytes: pixel
    });
    const document = await PDFDocument.load(bytes);
    const [page] = document.getPages();

    expect(document.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(mmToPoints(210), 1);
    expect(page.getHeight()).toBeCloseTo(mmToPoints(297), 1);
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
