import { Box, ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import theme from '../shared/theme/theme';
import { LanguageProvider } from '../shared/i18n/language-provider';
import { getStatusTone, StatusChip } from '../shared/ui/status-chip';

afterEach(cleanup);

const statuses = [
  { status: 'draft', tone: 'draft', label: 'Draft' },
  { status: 'pending_review', tone: 'pending', label: 'Pending review' },
  { status: 'published', tone: 'published', label: 'Published' },
  { status: 'rejected', tone: 'rejected', label: 'Rejected' },
  { status: 'archived', tone: 'archived', label: 'Archived' }
] as const;

describe('StatusChip', () => {
  it.each(['light', 'dark'] as const)('uses status tokens in the %s scheme', (scheme) => {
    render(
      <ThemeProvider theme={theme} defaultMode={scheme}>
        <LanguageProvider>
          <Box
            data-testid={`${scheme}-preview`}
            data-light={scheme === 'light' ? '' : undefined}
            data-dark={scheme === 'dark' ? '' : undefined}
          >
            {statuses.map(({ status }) => (
              <StatusChip key={status} status={status} />
            ))}
          </Box>
        </LanguageProvider>
      </ThemeProvider>
    );

    expect(screen.getByTestId(`${scheme}-preview`)).toHaveAttribute(`data-${scheme}`);

    for (const { status, tone, label } of statuses) {
      const chip = screen.getByText(label).closest('[data-status]');

      expect(chip).toHaveAttribute('data-status', status);
      expect(chip).toHaveAttribute('data-status-tone', tone);
      expect(getStatusTone(status)).toBe(tone);
    }

    expect(theme.palette.status.published.bg).toBeTruthy();
  });
});
