import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import { useColorScheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Fragment, useId, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  supportsEthiopicCalendar,
  type CalendarPreference,
} from '../../../shared/i18n/format-date';
import { SUPPORTED_LANGUAGES, type Language } from '../../../shared/i18n/languages';
import { setLanguage } from '../../../shared/i18n/setup';
import { useCalendarPreference, useDateFormat } from '../../../shared/i18n/use-date-format';
import { useLanguage } from '../../../shared/i18n/use-language';
import { PageHeader } from '../../../shared/ui/page-header';
import { TextSkeleton } from '../../../shared/ui/skeletons';
import type { ColorMode } from '../../../shared/ui/theme-mode-switch';
import { useMe, useSignOut } from '../../auth';

const COLOR_MODES: ColorMode[] = ['system', 'light', 'dark'];
const CALENDARS: CalendarPreference[] = ['language', 'gregorian', 'ethiopian'];

/** /account: profile, language, theme, date format and sign out. Settings apply at once. */
export function AccountScreen() {
  const { t } = useTranslation(['account', 'common']);
  const signOut = useSignOut();

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outlined" startIcon={<LogoutOutlined />} onClick={() => void signOut()}>
            {t('signOut')}
          </Button>
        }
      />
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <ProfileCard />
        <SettingsCard title={t('settings.title')}>
          <LanguageSetting />
          <ThemeSetting />
          <CalendarSetting />
        </SettingsCard>
      </Stack>
    </>
  );
}

function ProfileCard() {
  const { t } = useTranslation('account');
  const { data: me } = useMe();
  const { formatDate } = useDateFormat();
  const headingId = useId();

  return (
    <Card component="section" aria-labelledby={headingId}>
      <CardContent>
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2 }}>
          {t('profile')}
        </Typography>
        {me ? (
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, auto) 1fr' },
              columnGap: 3,
              rowGap: { xs: 0.5, sm: 2 },
              m: 0,
            }}
          >
            {(
              [
                [t('fields.name'), me.name ?? t('noName')],
                [t('fields.email'), me.email],
                [t('fields.role'), t(`roles.${me.role}`)],
                [t('fields.memberSince'), formatDate(me.createdAt)],
              ] as const
            ).map(([label, value]) => (
              <Fragment key={label}>
                <Typography component="dt" color="text.secondary">
                  {label}
                </Typography>
                <Typography
                  component="dd"
                  sx={{ m: 0, mb: { xs: 2, sm: 0 }, overflowWrap: 'anywhere' }}
                >
                  {value}
                </Typography>
              </Fragment>
            ))}
          </Box>
        ) : (
          <TextSkeleton lines={4} />
        )}
      </CardContent>
    </Card>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Card component="section" aria-labelledby={headingId}>
      <CardContent>
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Stack spacing={3}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

/** A radio group under a legend (one fieldset per setting). */
function RadioSetting<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  const hintId = useId();
  const labelId = useId();
  return (
    <FormControl component="fieldset">
      <FormLabel
        id={labelId}
        component="legend"
        sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}
      >
        {label}
      </FormLabel>
      <RadioGroup
        value={value}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
        sx={{ flexDirection: { xs: 'column', sm: 'row' }, columnGap: 2 }}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
            sx={{ minHeight: 44 }}
          />
        ))}
      </RadioGroup>
      {hint ? <FormHelperText id={hintId}>{hint}</FormHelperText> : null}
    </FormControl>
  );
}

function LanguageSetting() {
  const { t } = useTranslation(['account', 'common']);
  const language = useLanguage();
  return (
    <RadioSetting<Language>
      label={t('settings.language')}
      value={language}
      options={SUPPORTED_LANGUAGES.map((option) => ({
        value: option,
        label: (
          <Box component="span" lang={option}>
            {t(`common:languages.${option}`)}
          </Box>
        ),
      }))}
      onChange={(next) => void setLanguage(next)}
    />
  );
}

function ThemeSetting() {
  const { t } = useTranslation(['account', 'common']);
  const { mode, setMode } = useColorScheme();
  return (
    <RadioSetting<ColorMode>
      label={t('settings.theme')}
      value={mode ?? 'system'}
      options={COLOR_MODES.map((option) => ({ value: option, label: t(`common:theme.${option}`) }))}
      onChange={setMode}
    />
  );
}

function CalendarSetting() {
  const { t } = useTranslation('account');
  const [calendar, setCalendar] = useCalendarPreference();
  const { formatDate } = useDateFormat();
  // The same day in the chosen format, so the choice is easy to judge.
  const today = useMemo(() => new Date(), []);
  return (
    <RadioSetting<CalendarPreference>
      label={t('settings.calendar')}
      hint={
        supportsEthiopicCalendar()
          ? t('settings.calendarExample', { date: formatDate(today) })
          : t('settings.calendarUnsupported', { date: formatDate(today) })
      }
      value={calendar}
      options={CALENDARS.map((option) => ({
        value: option,
        label: t(`settings.calendars.${option}`),
      }))}
      onChange={setCalendar}
    />
  );
}
