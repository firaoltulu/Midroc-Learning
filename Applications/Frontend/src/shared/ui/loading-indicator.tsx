import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export function LoadingIndicator() {
  const { t } = useTranslation('common');

  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={t('loading')}
      sx={{
        flex: 1,
        minHeight: { xs: '42vh', sm: '48vh' },
        display: 'grid',
        placeItems: 'center',
        py: { xs: 5, sm: 7 },
      }}
    >
      <Stack aria-hidden spacing={2.25} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: 92,
            height: 92,
            borderRadius: '50%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 9,
              borderRadius: '50%',
              border: '3px solid',
              borderColor: 'action.hover',
            },
          }}
        >
          <CircularProgress
            size={74}
            thickness={2.5}
            sx={{ position: 'absolute', color: 'primary.main' }}
          />
          <SchoolOutlined sx={{ fontSize: 26, color: 'primary.main' }} />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {t('loading')}
        </Typography>
      </Stack>
    </Box>
  );
}
