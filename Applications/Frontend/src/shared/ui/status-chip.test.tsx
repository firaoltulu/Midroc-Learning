import type { Palette } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import { theme } from '../theme/theme';
import { AppThemeProvider, COLOR_MODE_STORAGE_KEY } from '../theme/theme-provider';
import { StatusChip } from './status-chip';
import { statusTone, type CourseStatus, type StatusTone } from './status-tone';

// The CSS-variables theme carries both schemes' palettes (MUI's `Theme` type doesn't expose them).
const schemeTokens = (
  theme as unknown as { colorSchemes: Record<'light' | 'dark', { palette: Palette }> }
).colorSchemes;

const cases: [CourseStatus, string, StatusTone][] = [
  ['draft', 'Draft', 'draft'],
  ['pending_review', 'In review', 'pending'],
  ['published', 'Published', 'published'],
  ['rejected', 'Rejected', 'rejected'],
  ['archived', 'Archived', 'archived'],
];

/** Resolves `var(--name)` against the custom properties visible to `element`. */
function resolveVar(element: Element, value: string): string {
  const name = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  if (!name) return value.toLowerCase();
  return getComputedStyle(element).getPropertyValue(name).trim().toLowerCase();
}

function renderInScheme(scheme: 'light' | 'dark', status: CourseStatus) {
  localStorage.setItem(COLOR_MODE_STORAGE_KEY, scheme);
  return render(
    <AppThemeProvider>
      <StatusChip status={status} />
    </AppThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-light');
  document.documentElement.removeAttribute('data-dark');
});

describe('statusTone', () => {
  it.each(cases)('maps %s to the %s tone', (status, _label, tone) => {
    expect(statusTone(status)).toBe(tone);
  });
});

describe.each(['light', 'dark'] as const)('StatusChip in the %s scheme', (scheme) => {
  it.each(cases)('shows %s as text "%s" with the %s tone colors', async (status, label, tone) => {
    renderInScheme(scheme, status);

    const chip = screen.getByText(label).closest('.MuiChip-root');
    expect(chip).not.toBeNull();
    expect(chip).toHaveAttribute('data-tone', tone);

    // The theme's colorSchemeSelector 'data' marks <html> with `data-light` / `data-dark`.
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(`data-${scheme}`);
    });

    const expected = schemeTokens[scheme].palette.status[tone];
    // jsdom keeps `var(...)` unresolved, so resolve it through the element's cascade: this
    // checks the chain tone -> CSS variable -> the value defined for the active scheme.
    const style = getComputedStyle(chip as Element);
    expect(style.color).toBe(`var(--mui-palette-status-${tone}-fg)`);
    expect(style.backgroundColor).toBe(`var(--mui-palette-status-${tone}-bg)`);
    expect(resolveVar(chip as Element, style.color)).toBe(expected.fg.toLowerCase());
    expect(resolveVar(chip as Element, style.backgroundColor)).toBe(expected.bg.toLowerCase());
  });
});
