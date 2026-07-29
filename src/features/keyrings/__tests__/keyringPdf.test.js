import { describe, expect, it, vi } from 'vitest';
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import {
  A4_SIZE_MM,
  KEYRING_PDF_LAYOUT,
  KEYRING_ROWS_PER_PAGE,
  SORA_FONT_NAME,
  WHATSAPP_NUMBER,
  buildKeyringPdfModel,
  normalizePlateList,
  openPdfBytesInNewTab,
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

  it('pairs cars into nine gapless rows with duplicate-safe plates', () => {
    expect(KEYRING_ROWS_PER_PAGE).toBe(9);
    expect(normalizePlateList(['BF-07-JZ', 'AA-11-BB', 'BF07JZ'])).toEqual(['BF-07-JZ', 'AA-11-BB']);
    const model = buildKeyringPdfModel(['BF-07-JZ', 'AA-11-BB', 'CC-22-DD']);
    expect(model.rows).toHaveLength(2);
    expect(model.rows[1].strip.top).toBe(model.rows[0].strip.top + model.rows[0].strip.height);
    expect(model.rows[0].strip.width).toBe(KEYRING_PDF_LAYOUT.strip.width);
    expect(model.rows[1].strip.width).toBe(KEYRING_PDF_LAYOUT.strip.width / 2);
  });

  it('builds two cells per car and four cells when two cars share a row', () => {
    const singleModel = buildKeyringPdfModel('BF-07-JZ');
    const pairedModel = buildKeyringPdfModel(['BF-07-JZ', 'AA-11-BB']);

    expect(singleModel.cells).toHaveLength(2);
    expect(singleModel.dividers).toHaveLength(1);
    expect(pairedModel.rows).toHaveLength(1);
    expect(pairedModel.cells).toHaveLength(4);
    expect(pairedModel.dividers).toHaveLength(3);
    expect(pairedModel.cells.every((cell) => cell.width === KEYRING_PDF_LAYOUT.strip.width / 4)).toBe(true);
  });

  it('creates one keyring with one plate and phone pair per selected car', () => {
    const model = buildKeyringPdfModel(' bf 07 jz ');

    expect(model.plates.map((item) => item.text)).toEqual(['BF-07-JZ']);
    expect(model.phones.map((item) => item.text)).toEqual([WHATSAPP_NUMBER]);
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

  it('draws two cars in one row with three internal dividers', async () => {
    const pixel = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const bytes = await createKeyringPdfBytes(['BF-07-JZ', 'AA-11-BB'], {
      logoPngBytes: pixel,
      whatsappPngBytes: pixel
    });
    const document = await PDFDocument.load(bytes);
    const contents = document.getPages()[0].node.Contents();
    const streamRefs = contents instanceof PDFArray ? contents.asArray() : [contents];
    const contentStream = streamRefs
      .map((streamRef) => document.context.lookup(streamRef, PDFRawStream))
      .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
      .join('\n');

    expect(contentStream.match(/\n0 0 m\n/g) ?? []).toHaveLength(0);
    expect(contentStream.match(/^.* m\n.* m\n.* l\nS$/gm) ?? []).toHaveLength(7);
  });

  it('draws an odd final car as a half-width row without empty right-side cells', async () => {
    const pixel = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const bytes = await createKeyringPdfBytes(['BF-07-JZ', 'AA-11-BB', 'CC-22-DD'], {
      logoPngBytes: pixel,
      whatsappPngBytes: pixel
    });
    const document = await PDFDocument.load(bytes);
    const contents = document.getPages()[0].node.Contents();
    const streamRefs = contents instanceof PDFArray ? contents.asArray() : [contents];
    const contentStream = streamRefs
      .map((streamRef) => document.context.lookup(streamRef, PDFRawStream))
      .map((stream) => new TextDecoder().decode(decodePDFRawStream(stream).decode()))
      .join('\n');

    expect(contentStream.match(/\n0 0 m\n/g) ?? []).toHaveLength(0);
    expect(contentStream.match(/^.* m\n.* m\n.* l\nS$/gm) ?? []).toHaveLength(10);
  });

  it('creates a second A4 page after eighteen selected plates', async () => {
    const pixel = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const plates = Array.from({ length: 19 }, (_, index) => `AA-${String(index + 1).padStart(2, '0')}-BB`);
    const eighteenPlateBytes = await createKeyringPdfBytes(plates.slice(0, 18), { logoPngBytes: pixel, whatsappPngBytes: pixel });
    const nineteenPlateBytes = await createKeyringPdfBytes(plates, { logoPngBytes: pixel, whatsappPngBytes: pixel });
    const eighteenPlateDocument = await PDFDocument.load(eighteenPlateBytes);
    const nineteenPlateDocument = await PDFDocument.load(nineteenPlateBytes);

    expect(eighteenPlateDocument.getPageCount()).toBe(1);
    expect(nineteenPlateDocument.getPageCount()).toBe(2);
    expect(nineteenPlateDocument.getPages().every((page) => page.getWidth() === mmToPoints(210))).toBe(true);
  });

  it('opens generated PDF bytes in a new tab instead of creating a download link', () => {
    const pdfWindow = { location: { href: '' }, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(pdfWindow);
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:keyring');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const timeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 1;
    });

    openPdfBytesInNewTab(new Uint8Array([1, 2, 3]));

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(pdfWindow.location.href).toBe('blob:keyring');
    expect(createObjectUrlSpy).toHaveBeenCalledOnce();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:keyring');
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    timeoutSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    openSpy.mockRestore();
  });
});
