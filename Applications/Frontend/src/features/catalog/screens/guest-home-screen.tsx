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
import { HowItWorks } from '../components/how-it-works';
import { PlatformFaq } from '../components/platform-faq';
import { ScrollReveal } from '../components/scroll-reveal';

const HIGHLIGHTS = ['languages', 'formats', 'progress'] as const;

/**
 * `/welcome`: the home page before sign-in. The hero (headline, Join for free, Sign in and
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
          <PlatformFaq />
          <ShareInvitation />
        </Stack>
      </Container>
    </>
  );
}

function Hero() {
  const { t } = useTranslation('catalog');
  return (
    <HeroBand tone="surface">
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3.5, md: 6 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <ScrollReveal>
            <Typography
              variant="h1"
              sx={{
                fontSize: {
                  xs: 'clamp(2rem, 7vw, 2.75rem)',
                  md: 'clamp(2.5rem, 4vw, 3.5rem)',
                },
                fontWeight: 700,
                lineHeight: 1.18,
                maxWidth: '18ch',
                overflowWrap: 'anywhere',
              }}
            >
              {t('guest.title')}
            </Typography>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.7,
                maxWidth: '42rem',
              }}
            >
              {t('guest.subtitle')}
            </Typography>
          </ScrollReveal>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            <ScrollReveal delay={140}>
              <ButtonLink
                to="/signup"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {t('guest.join')}
              </ButtonLink>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <ButtonLink
                to="/login"
                variant="outlined"
                size="large"
                sx={{
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  '&:hover': { borderColor: 'primary.dark', bgcolor: 'surfaceMuted' },
                }}
              >
                {t('guest.signIn')}
              </ButtonLink>
            </ScrollReveal>
          </Stack>
        </Stack>

        <ScrollReveal delay={120}>
          <Box
            component="section"
            aria-labelledby="guest-highlights"
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: '0 12px 32px rgba(13, 36, 25, 0.06)',
              p: { xs: 2.5, md: 3 },
            }}
          >
            <ScrollReveal>
              <Typography id="guest-highlights" variant="h5" component="h2" sx={{ mb: 2 }}>
                {t('guest.highlights.title')}
              </Typography>
            </ScrollReveal>
            <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {HIGHLIGHTS.map((id, index) => (
                <ScrollReveal key={id} component="li" delay={index * 70}>
                  <Stack direction="row" spacing={1.5}>
                    <CheckCircleOutlined
                      aria-hidden
                      sx={{ mt: 0.25, flexShrink: 0, color: 'primary.main' }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        {t(`guest.highlights.${id}.title`)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(`guest.highlights.${id}.body`)}
                      </Typography>
                    </Box>
                  </Stack>
                </ScrollReveal>
              ))}
            </Stack>
          </Box>
        </ScrollReveal>
      </Box>
    </HeroBand>
  );
}

function ShareInvitation() {
  const { t } = useTranslation('catalog');
  return (
    <ScrollReveal>
      <Card
        component="section"
        aria-labelledby="share-knowledge"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(220px, 0.34fr)' },
          overflow: 'hidden',
          border: 1,
          borderTop: 4,
          borderColor: 'divider',
          borderTopColor: 'primary.main',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
        <Box sx={{ p: { xs: 2.5, sm: 3.5, md: 4 } }}>
          <ScrollReveal>
            <Typography
              id="share-knowledge"
              variant="h2"
              component="h2"
              sx={{
                mb: 1.25,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 700,
                lineHeight: 1.3,
                overflowWrap: 'anywhere',
              }}
            >
              {t('guest.share.title')}
            </Typography>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <Typography
              color="text.secondary"
              sx={{
                maxWidth: '60ch',
                fontSize: '1rem',
                lineHeight: 1.75,
                overflowWrap: 'anywhere',
              }}
            >
              {t('guest.share.body')}
            </Typography>
          </ScrollReveal>
        </Box>
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            bgcolor: 'surfaceMuted',
            borderTop: { xs: 1, md: 0 },
            borderInlineStart: { xs: 0, md: '1px solid' },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'center',
          }}
        >
          <ScrollReveal delay={140}>
            <ButtonLink
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                width: { xs: '100%', md: 'auto' },
                minWidth: { md: 190 },
                justifyContent: 'center',
                whiteSpace: 'normal',
                textAlign: 'center',
              }}
            >
              {t('guest.share.action')}
            </ButtonLink>
          </ScrollReveal>
        </Box>
      </Card>
    </ScrollReveal>
  );
}
