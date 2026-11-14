import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { HeroBand } from '../../../shared/ui/hero-band';
import { ButtonLink } from '../../../shared/ui/router-links';
import { ExploreCategories, NewAndPopular } from '../components/home-sections';

const HIGHLIGHTS = ['languages', 'formats', 'progress'] as const;
const STEPS = ['join', 'enroll', 'learn'] as const;

/**
 * `/welcome`: the home page before sign-in. The green hero (headline, Join for free, Sign in and
 * what the platform offers), real popular and new courses and the categories (GET /public/...),
 * how it works, and an invitation to share what you know. Course and category links lead to
 * sign-in first, then back to where the visitor was going.
 */
export function GuestHomeScreen() {
  return (
    <>
      <Hero />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={{ xs: 5, md: 7 }}>
          <NewAndPopular guest />
          <ExploreCategories guest />
          <HowItWorks />
          <ShareInvitation />
        </Stack>
      </Container>
    </>
  );
}

function Hero() {
  const { t } = useTranslation('catalog');
  return (
    <HeroBand>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 4, md: 6 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'flex-start', maxWidth: 640 }}>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, lineHeight: 1.15 }}
          >
            {t('guest.title')}
          </Typography>
          <Typography sx={{ color: 'hero.fgMuted', fontSize: '1.125rem' }}>
            {t('guest.subtitle')}
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            <ButtonLink
              to="/signup"
              variant="contained"
              size="large"
              // Inverted on the band (light button, band-green text) in both schemes.
              sx={{ bgcolor: 'hero.fg', color: 'hero.bg', '&:hover': { bgcolor: 'hero.fgMuted' } }}
            >
              {t('guest.join')}
            </ButtonLink>
            <ButtonLink
              to="/login"
              variant="outlined"
              size="large"
              sx={{
                color: 'hero.fg',
                borderColor: 'hero.fgMuted',
                '&:hover': { borderColor: 'hero.fg' },
              }}
            >
              {t('guest.signIn')}
            </ButtonLink>
          </Stack>
        </Stack>

        <Box
          component="section"
          aria-labelledby="guest-highlights"
          sx={{ border: 1, borderColor: 'hero.fgMuted', borderRadius: 3.5, p: { xs: 2.5, md: 3 } }}
        >
          <Typography id="guest-highlights" variant="h5" component="h2" sx={{ mb: 2 }}>
            {t('guest.highlights.title')}
          </Typography>
          <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {HIGHLIGHTS.map((id) => (
              <Stack component="li" key={id} direction="row" spacing={1.5}>
                <CheckCircleOutlined aria-hidden sx={{ mt: 0.25, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {t(`guest.highlights.${id}.title`)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'hero.fgMuted' }}>
                    {t(`guest.highlights.${id}.body`)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
    </HeroBand>
  );
}

function HowItWorks() {
  const { t } = useTranslation('catalog');
  return (
    <Stack component="section" aria-labelledby="how-it-works" spacing={2.5}>
      <Typography id="how-it-works" variant="h3" component="h2">
        {t('guest.steps.title')}
      </Typography>
      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {STEPS.map((id, index) => (
          <Card component="li" key={id} sx={{ p: 2.5 }}>
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                mb: 1.5,
              }}
            >
              {index + 1}
            </Box>
            <Typography variant="h5" component="h3" sx={{ mb: 0.5 }}>
              {t(`guest.steps.${id}.title`)}
            </Typography>
            <Typography color="text.secondary">{t(`guest.steps.${id}.body`)}</Typography>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}

function ShareInvitation() {
  const { t } = useTranslation('catalog');
  return (
    <Card
      component="section"
      aria-labelledby="share-knowledge"
      sx={{
        bgcolor: 'surfaceMuted',
        p: { xs: 3, md: 4 },
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2.5,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ maxWidth: 720 }}>
        <Typography id="share-knowledge" variant="h3" component="h2" sx={{ mb: 1 }}>
          {t('guest.share.title')}
        </Typography>
        <Typography color="text.secondary">{t('guest.share.body')}</Typography>
      </Box>
      {/* Outlined: the hero's "Join for free" is the page's one primary button. */}
      <ButtonLink to="/signup" variant="outlined" size="large">
        {t('guest.share.action')}
      </ButtonLink>
    </Card>
  );
}
