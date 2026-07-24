import { describe, expect, it } from 'vitest';
import { formatPhoneForDisplay, getWhatsAppHref } from '../phone';

describe('phone helpers', () => {
  it('builds a WhatsApp link from plus-prefixed international numbers', () => {
    expect(getWhatsAppHref('+351 912 345 678')).toBe('whatsapp://send?phone=351912345678');
  });

  it('builds a WhatsApp link from double-zero-prefixed international numbers', () => {
    expect(getWhatsAppHref('00351 912 345 678')).toBe('whatsapp://send?phone=351912345678');
  });

  it('builds a WhatsApp link from recognized local Portuguese numbers', () => {
    expect(getWhatsAppHref('912 345 678')).toBe('whatsapp://send?phone=351912345678');
  });

  it('returns an empty string for ambiguous values', () => {
    expect(getWhatsAppHref('abc123')).toBe('');
  });

  it('formats international phones as a country code followed by groups of three', () => {
    expect(formatPhoneForDisplay('+351961339825')).toBe('+351 961 339 825');
  });

  it('retains digits beyond the first three subscriber groups', () => {
    expect(formatPhoneForDisplay('+447700900123')).toBe('+44 770 090 012 3');
  });

  it('leaves ambiguous phone values unchanged', () => {
    expect(formatPhoneForDisplay('ver notas')).toBe('ver notas');
  });
});
