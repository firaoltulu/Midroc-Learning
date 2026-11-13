import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveCalendar } from '../../../shared/i18n/format-date';
import { useCalendarPreference, useDateFormat } from '../../../shared/i18n/use-date-format';
import { useLanguage } from '../../../shared/i18n/use-language';
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

      <Section title={t('sections.dates')} headingLevel="h2">
        <DateSamples />
      </Section>

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

        <Section title={t('sections.longText')}>
          <LongLabels />
        </Section>
      </Stack>
    </Box>
  );
}

/** Long labels in tabs, a button, a chip and table headers: they must wrap, never clip. */
function LongLabels() {
  const { t } = useTranslation('design');
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Tabs
        value={tab}
        onChange={(_event, value: number) => {
          setTab(value);
        }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab label={t('long.tabDetails')} />
        <Tab label={t('long.tabContent')} />
        <Tab label={t('long.tabReview')} />
      </Tabs>
      <Box>
        <Button variant="contained" sx={{ maxWidth: '100%' }}>
          {t('long.button')}
        </Button>
      </Box>
      <Box>
        <Chip
          label={t('long.chip')}
          sx={{
            height: 'auto',
            maxWidth: '100%',
            '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
          }}
        />
      </Box>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: '10px' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('long.columnTitle')}</TableCell>
              <TableCell align="right">{t('long.columnLearners')}</TableCell>
              <TableCell>{t('long.columnUpdated')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{t('samples.cardTitle')}</TableCell>
              <TableCell align="right">128</TableCell>
              <TableCell>
                <StatusChip status="pending_review" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

/** One fixed moment in the current language and calendar setting. */
function DateSamples() {
  const { t } = useTranslation('design');
  const language = useLanguage();
  const [preference] = useCalendarPreference();
  const { formatDate, formatDateTime, formatRelative } = useDateFormat();
  const sample = new Date(2026, 10, 13, 9, 30);
  const now = new Date(2026, 10, 13, 12, 30);

  const rows: [string, string][] = [
    [t('dates.calendar'), t(`dates.calendarName.${resolveCalendar(language, preference)}`)],
    [t('dates.date'), formatDate(sample)],
    [t('dates.dateTime'), formatDateTime(sample)],
    [t('dates.relative'), formatRelative(sample, now)],
  ];

  return (
    <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, m: 0 }}>
      {rows.map(([label, value]) => (
        <Fragment key={label}>
          <Typography component="dt" color="text.secondary">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0 }}>
            {value}
          </Typography>
        </Fragment>
      ))}
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
    // Page-level (h2) sections sit in a plain flow, so they carry their own bottom margin.
    <Stack component="section" spacing={1.5} sx={{ mb: headingLevel === 'h2' ? 4 : 0 }}>
      <Typography variant="h5" component={headingLevel} color="text.secondary">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}
