import CheckOutlined from '@mui/icons-material/CheckOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useSaveState } from '../model/save-tracker';

/** "Saving…" / "Saved" / "Couldn't save" / "Not saved yet", announced politely (icon plus text, never colour alone). */
export function SaveIndicator() {
  const { t } = useTranslation('editor');
  const state = useSaveState();

  const Icon =
    state === 'error' || state === 'invalid'
      ? ErrorOutlineOutlined
      : state === 'saving'
        ? SyncOutlined
        : CheckOutlined;
  const label =
    state === 'error'
      ? t('save.error')
      : state === 'invalid'
        ? t('save.invalid')
        : state === 'saving'
          ? t('save.saving')
          : state === 'saved'
            ? t('save.saved')
            : t('save.idle');

  return (
    <Stack
      direction="row"
      spacing={0.75}
      role="status"
      aria-live="polite"
      data-state={state}
      sx={{ alignItems: 'center', color: state === 'error' ? 'error.main' : 'text.secondary' }}
    >
      <Icon aria-hidden fontSize="small" />
      <Typography variant="body2" sx={{ color: 'inherit' }}>
        {label}
      </Typography>
    </Stack>
  );
}
