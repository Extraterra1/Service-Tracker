import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync('src/App.css', 'utf8');

describe('ServiceItemCard mobile service type label', () => {
  it('hides the service type label on mobile', () => {
    expect(appCss).toMatch(
      /@media \(max-width: 780px\)\s*{[\s\S]*?\.item-service-type\s*{[\s\S]*?display:\s*none;/
    );
  });
});
