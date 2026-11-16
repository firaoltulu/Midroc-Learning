import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './scroll-reveal';

const STEPS = ['join', 'enroll', 'learn'] as const;

export function HowItWorks() {
  const { t } = useTranslation('catalog');
  return (
    <Stack component="section" aria-labelledby="how-it-works" spacing={3}>
      <ScrollReveal>
        <Typography
          id="how-it-works"
          variant="h2"
          component="h2"
          sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 700 }}
        >
          {t('guest.steps.title')}
        </Typography>
      </ScrollReveal>
      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          position: 'relative',
          display: 'grid',
          gap: { xs: 2, md: 2.5 },
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 44,
            left: '16.67%',
            right: '16.67%',
            height: 1,
            bgcolor: 'divider',
            display: { xs: 'none', md: 'block' },
          },
        }}
      >
        {STEPS.map((id, index) => (
          <ScrollReveal key={id} component="li" delay={index * 80}>
            <Card
              sx={(theme) => ({
                height: '100%',
                p: { xs: 2.25, sm: 2.75 },
                display: 'flex',
                flexDirection: 'column',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: 'none',
                transition: theme.transitions.create(['transform', 'border-color', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                  boxShadow: theme.shadows[4],
                },
              })}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  width: 44,
                  height: 44,
                  border: 1,
                  borderColor: 'primary.main',
                  borderRadius: '6px',
                  alignSelf: 'center',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '1rem',
                  fontWeight: 700,
                  mb: 2.5,
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </Box>
              <Typography
                variant="h5"
                component="h3"
                sx={{
                  mb: 1,
                  minHeight: '2.8em',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  lineHeight: 1.4,
                  overflowWrap: 'anywhere',
                }}
              >
                {t(`guest.steps.${id}.title`)}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: '0.9375rem', lineHeight: 1.7, overflowWrap: 'anywhere' }}
              >
                {t(`guest.steps.${id}.body`)}
              </Typography>
            </Card>
          </ScrollReveal>
        ))}
      </Box>
    </Stack>
  );
}
