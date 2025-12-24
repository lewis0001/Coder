import { colors, spacing, typography } from './tokens';

describe('design tokens', () => {
  it('exposes core primitives', () => {
    expect(colors.accent.primary).toMatch(/^#/);
    expect(Object.keys(spacing).length).toBeGreaterThan(3);
    expect(typography.fontFamily).toBeDefined();
  });
});
