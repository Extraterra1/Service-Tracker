import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appCssPath = resolve(process.cwd(), 'src/App.css');
const appCss = readFileSync(appCssPath, 'utf8');

describe('Service item time menu flash regressions', () => {
  it('does not toggle pane z-index using :has() when time menu opens/closes', () => {
    expect(appCss).not.toMatch(/\.service-pane:has\(\.service-item\.has-time-menu\)\s*\{/);
  });

  it('keeps containment properties stable when has-time-menu class is toggled', () => {
    const hasTimeMenuBlock = appCss.match(/\.service-item\.has-time-menu\s*\{([\s\S]*?)\}/);
    expect(hasTimeMenuBlock).not.toBeNull();

    const blockBody = hasTimeMenuBlock?.[1] ?? '';
    expect(blockBody).not.toMatch(/content-visibility\s*:/);
    expect(blockBody).not.toMatch(/contain-intrinsic-size\s*:/);
  });
});
