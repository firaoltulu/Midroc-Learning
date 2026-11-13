import Chip, { type ChipProps } from '@mui/material/Chip';
import { useTranslation } from '../i18n/translate';
import { statusTone, type CourseStatus } from './status-tone';

export type { CourseStatus } from './status-tone';

export interface StatusChipProps {
  status: CourseStatus;
  size?: ChipProps['size'];
}

/** The one way to show a course status: tone from the theme plus a translated text label. */
export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const { t } = useTranslation('common');
  const tone = statusTone(status);

  return (
    <Chip
      size={size}
      label={t(`status.${status}`)}
      data-tone={tone}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return {
          color: palette.status[tone].fg,
          backgroundColor: palette.status[tone].bg,
          maxWidth: '100%',
        };
      }}
    />
  );
}
