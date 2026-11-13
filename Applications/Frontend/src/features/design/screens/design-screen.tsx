import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { useTranslation } from '../../../shared/i18n/translate';
import type { ResolvedColorScheme } from '../../../shared/theme/use-resolved-color-scheme';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { EmptyState } from '../../../shared/ui/empty-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { CardGridSkeleton, ListSkeleton, TextSkeleton } from '../../../shared/ui/skeletons';
import { StatusChip, type CourseStatus } from '../../../shared/ui/status-chip';
import { useToast } from '../../../shared/ui/toast/toast-context';

const statuses: CourseStatus[] = ['draft', 'pending_review', 'published', 'rejected', 'archived'];
const schemes: ResolvedColorScheme[] = ['light', 'dark'];

/**
 * TEMPORARY review page: every shared component, rendered side by side in both color schemes.
 * Each panel re-scopes the theme's CSS variables with a `data-light` / `data-dark` attribute.
 */
export function DesignScreen() {
  const { t } = useTranslation('design');
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader title={t('title')} description={t('intro')} />

      <Section title={t('sections.overlays')} headingLevel="h2">
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            {t('samples.openDialog')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              toast.show({ message: t('samples.toastMessage'), severity: 'success' });
            }}
          >
            {t('samples.showToast')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              toast.show({ message: t('samples.toastError'), severity: 'error' });
            }}
          >
            {t('samples.showErrorToast')}
          </Button>
        </Stack>
      </Section>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          mt: 4,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {schemes.map((scheme) => (
          <SchemePanel key={scheme} scheme={scheme} />
        ))}
      </Box>

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title={t('samples.dialogTitle')}
        description={t('samples.dialogBody')}
        confirmLabel={t('samples.dialogConfirm')}
        onConfirm={() =>
          new Promise((resolve) => setTimeout(resolve, 800)).then(() => {
            setDialogOpen(false);
          })
        }
        onClose={() => {
          setDialogOpen(false);
        }}
      />
    </>
  );
}

function SchemePanel({ scheme }: { scheme: ResolvedColorScheme }) {
  const { t } = useTranslation('design');

  return (
    <Box
      component="section"
      aria-labelledby={`scheme-${scheme}`}
      // The theme's colorSchemeSelector 'data' scopes each scheme's CSS variables to
      // `[data-light]` / `[data-dark]`, so this attribute re-themes the whole panel.
      {...{ [`data-${scheme}`]: '' }}
      sx={{
        colorScheme: scheme,
        bgcolor: 'background.default',
        color: 'text.primary',
        border: 1,
        borderColor: 'divider',
        borderRadius: '14px',
        p: { xs: 2, sm: 3 },
        minWidth: 0,
      }}
    >
      <Typography id={`scheme-${scheme}`} variant="h3" component="h2" sx={{ mb: 3 }}>
        {t(`schemes.${scheme}`)}
      </Typography>

      <Stack spacing={4}>
        <Section title={t('sections.brand')}>
          <Stack
            direction="row"
            spacing={3}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <BrandLogo variant="full" height={40} colorScheme={scheme} />
            <BrandLogo variant="mark" height={40} colorScheme={scheme} />
          </Stack>
        </Section>

        <Section title={t('sections.typography')}>
          <Stack spacing={1}>
            {([1, 2, 3, 4] as const).map((level) => (
              <Typography key={level} variant={`h${level}`} component="p">
                {t('samples.heading', { level })}
              </Typography>
            ))}
            <Typography sx={{ maxWidth: 720 }}>{t('samples.body')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('samples.caption')}
            </Typography>
          </Stack>
        </Section>

        <Section title={t('sections.status')}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {statuses.map((status) => (
              <StatusChip key={status} status={status} />
            ))}
          </Stack>
        </Section>

        <Section title={t('sections.buttons')}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained">{t('samples.primary')}</Button>
            <Button variant="outlined">{t('samples.secondary')}</Button>
            <Button>{t('samples.tertiary')}</Button>
          </Stack>
        </Section>

        <Section title={t('sections.form')}>
          <Stack spacing={2} sx={{ maxWidth: 420 }}>
            <TextField label={t('samples.inputLabel')} helperText={t('samples.inputHelp')} />
            <TextField label={t('samples.inputLabel')} helperText={t('samples.inputError')} error />
          </Stack>
        </Section>

        <Section title={t('sections.card')}>
          <Card sx={{ maxWidth: 360 }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="h4" component="p" sx={{ flex: 1 }}>
                    {t('samples.cardTitle')}
                  </Typography>
                  <Chip size="small" color="secondary" label={t('samples.featured')} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('samples.cardBody')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Section>

        <Section title={t('sections.pageHeader')}>
          <Box sx={{ '& h1': { fontSize: '1.375rem' } }}>
            <Typography
              variant="h3"
              component="p"
              sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
            >
              {t('samples.headerTitle')}
              <StatusChip status="published" />
            </Typography>
            <Typography color="text.secondary">{t('samples.headerDescription')}</Typography>
          </Box>
        </Section>

        <Section title={t('sections.emptyState')}>
          <EmptyState
            headingLevel="h3"
            icon={<SchoolOutlined />}
            title={t('samples.emptyTitle')}
            description={t('samples.emptyBody')}
            action={<Button variant="contained">{t('samples.primary')}</Button>}
          />
        </Section>

        <Section title={t('sections.errorState')}>
          <ErrorState headingLevel="h3" onRetry={() => undefined} />
        </Section>

        <Section title={t('sections.skeletons')}>
          <Stack spacing={3}>
            <TextSkeleton lines={3} />
            <ListSkeleton rows={2} />
            <CardGridSkeleton count={2} />
          </Stack>
        </Section>
      </Stack>
    </Box>
  );
}

function Section({
  title,
  children,
  headingLevel = 'h3',
}: {
  title: string;
  children: ReactNode;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <Stack component="section" spacing={1.5}>
      <Typography variant="h5" component={headingLevel} color="text.secondary">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
