import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ServiceItemCard ready plate focus styles', () => {
  it('keeps the ready color while the plate button retains focus', () => {
    const appCss = fs.readFileSync(path.resolve(globalThis.process.cwd(), 'src/App.css'), 'utf8');

    expect(appCss).toMatch(
      /\.item-plate-button\.is-ready:not\(:disabled\):focus-visible\s*\{[\s\S]*?border-color:\s*rgba\(55,\s*148,\s*86,\s*0\.38\);[\s\S]*?background:\s*rgba\(102,\s*199,\s*134,\s*0\.18\);/
    );
  });
});
