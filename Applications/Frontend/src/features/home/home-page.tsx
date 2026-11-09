import { Box, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation('home');

  return (
    <Box component="section" aria-label={t('welcome')}>
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 9 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)' },
            alignItems: 'center',
            gap: { xs: 5, md: 8 }
          }}
        >
          <Stack spacing={3} maxWidth={680}>
            <Typography
              variant="overline"
              color="primary.dark"
              fontWeight={700}
              letterSpacing="0.12em"
            >
              {t('welcome')}
            </Typography>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4.25rem' },
                lineHeight: 1.08,
                maxWidth: '12ch'
              }}
            >
              {t('headline')}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.75, maxWidth: 560 }}
            >
              {t('description')}
            </Typography>
          </Stack>

          <Card
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 300, sm: 340 },
              border: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper'
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                width: 230,
                height: 230,
                borderRadius: '50%',
                top: -85,
                right: -55,
                backgroundColor: 'primary.light',
                opacity: 0.72
              }}
            />
            <CardContent
              sx={{
                position: 'relative',
                minHeight: { xs: 300, sm: 340 },
                p: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {t('nextStepLabel')}
                </Typography>
                <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
                  {t('nextStepTitle')}
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 56,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'secondary.main'
                  }}
                />
                <Typography color="text.secondary" lineHeight={1.7}>
                  {t('nextStepDescription')}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {t('comingSoon')}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
