import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import { useColorScheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useId, useMemo, type ReactNode } from 'react';
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
    <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto' }}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            color="error"
            variant="outlined"
            startIcon={<LogoutOutlined />}
            onClick={() => void signOut()}
          >
            {t('signOut')}
          </Button>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: 'minmax(260px, 0.8fr) minmax(0, 1.45fr)',
          },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <ProfileCard />
        <SettingsCard title={t('settings.title')}>
          <LanguageSetting />
          <ThemeSetting />
          <CalendarSetting />
        </SettingsCard>
      </Box>
    </Box>
  );
}

function ProfileCard() {
  const { t } = useTranslation('account');
  const { data: me } = useMe();
  const { formatDate } = useDateFormat();
  const headingId = useId();

  return (
    <Card
      component="section"
      aria-labelledby={headingId}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
        <Stack spacing={2.5}>
          <Typography id={headingId} variant="h6" component="h2">
            {t('profile')}
          </Typography>
          {me ? (
            <>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
              >
                <Avatar
                  aria-hidden
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  {me.name?.trim().slice(0, 1) || me.email.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="h5"
                    component="p"
                    sx={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}
                  >
                    {me.name?.trim() || t('noName')}
                  </Typography>
                  <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {me.email}
                  </Typography>
                </Box>
              </Stack>
              <Box
                component="dl"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.5,
                  m: 0,
                }}
              >
                {[
                  [t('fields.role'), t(`roles.${me.role}`)],
                  [t('fields.memberSince'), formatDate(me.createdAt)],
                ].map(([label, value]) => (
                  <Box
                    key={label}
                    sx={{
                      minWidth: 0,
                      p: 1.75,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: 'surfaceMuted',
                    }}
                  >
                    <Typography
                      component="dt"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      component="dd"
                      sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <TextSkeleton lines={4} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Card
      component="section"
      aria-labelledby={headingId}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, boxShadow: 'none' }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2.5 }}>
          {title}
        </Typography>
        <Stack spacing={2.25} divider={<Divider flexItem />}>
          {children}
        </Stack>
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
    <FormControl component="fieldset" sx={{ width: '100%', minWidth: 0 }}>
      <FormLabel
        id={labelId}
        component="legend"
        sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}
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
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, 1fr))' },
          gap: 1,
        }}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio sx={{ p: 0.75 }} />}
            label={option.label}
            sx={{
              m: 0,
              minWidth: 0,
              minHeight: 46,
              px: 0.75,
              border: 1,
              borderColor: option.value === value ? 'primary.main' : 'divider',
              borderRadius: 1.25,
              bgcolor: option.value === value ? 'surfaceMuted' : 'transparent',
              transition: (theme) =>
                theme.transitions.create(['border-color', 'background-color'], {
                  duration: theme.transitions.duration.shortest,
                }),
              '&:hover': { borderColor: 'primary.main', bgcolor: 'surfaceMuted' },
              '& .MuiFormControlLabel-label': { minWidth: 0, overflowWrap: 'anywhere' },
            }}
          />
        ))}
      </RadioGroup>
      {hint ? (
        <FormHelperText id={hintId} sx={{ mx: 0, mt: 1.25 }}>
          {hint}
        </FormHelperText>
      ) : null}
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
