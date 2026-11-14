import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import type { AccountStatus } from '../api/users';

/** Active / Suspended, with a tone and the word (never color alone). */
export function AccountStatusChip({ status }: { status: AccountStatus }) {
  const { t } = useTranslation('admin');
  const tone = status === 'active' ? 'published' : 'rejected';
  return (
    <Chip
      size="small"
      label={t(`users.status.${status}`)}
      data-tone={tone}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return { color: palette.status[tone].fg, backgroundColor: palette.status[tone].bg };
      }}
    />
  );
}
