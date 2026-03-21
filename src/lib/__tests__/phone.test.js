import { describe, expect, it } from 'vitest';
import { getWhatsAppHref } from '../phone';

describe('phone helpers', () => {
  it('builds a WhatsApp link from plus-prefixed international numbers', () => {
    expect(getWhatsAppHref('+351 912 345 678')).toBe('https://wa.me/351912345678');
  });

  it('builds a WhatsApp link from double-zero-prefixed international numbers', () => {
    expect(getWhatsAppHref('00351 912 345 678')).toBe('https://wa.me/351912345678');
  });

  it('builds a WhatsApp link from recognized local Portuguese numbers', () => {
    expect(getWhatsAppHref('912 345 678')).toBe('https://wa.me/351912345678');
  });

  it('returns an empty string for ambiguous values', () => {
    expect(getWhatsAppHref('abc123')).toBe('');
  });
});
