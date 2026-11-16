import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HeroBand } from '../../../shared/ui/hero-band';
import { ButtonLink } from '../../../shared/ui/router-links';
import { enrollmentsQueryOptions } from '../../learning';
import { HowItWorks } from '../components/how-it-works';
import {
  ContinueLearningCard,
  ContinueLearningSkeleton,
} from '../components/continue-learning-card';
import { ExploreCategories, NewAndPopular } from '../components/home-sections';
import { PlatformFaq } from '../components/platform-faq';
import { ScrollReveal } from '../components/scroll-reveal';
import { pickContinueCourse } from '../lib/continue-course';

/**
 * `/`: a learning hero with a course to continue or platform highlights, "New and popular"
 * (most popular / new / Amharic) and "Explore categories" with course counts.
 */
export function HomeScreen() {
  return (
    <>
      <Hero />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={{ xs: 5, md: 7 }}>
          <NewAndPopular />
          <ExploreCategories />
          <HowItWorks />
          <PlatformFaq />
        </Stack>
      </Container>
    </>
  );
}

function Hero() {
  const { t } = useTranslation('catalog');
  const enrollments = useQuery(enrollmentsQueryOptions());
  const current = enrollments.data ? pickContinueCourse(enrollments.data) : undefined;

  return (
    <HeroBand tone="surface">
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3.5, md: 6 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)' },
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'flex-start', maxWidth: 680, minWidth: 0 }}>
          <ScrollReveal>
            <Typography
              variant="h1"
              sx={{
                fontSize: {
                  xs: 'clamp(2rem, 7vw, 2.75rem)',
                  md: 'clamp(2.5rem, 4vw, 3.25rem)',
                },
                fontWeight: 700,
                lineHeight: 1.16,
                maxWidth: '17ch',
                overflowWrap: 'anywhere',
              }}
            >
              {t('home.title')}
            </Typography>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <Typography
              color="text.secondary"
              sx={{ fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: 560 }}
            >
              {t('home.subtitle')}
            </Typography>
          </ScrollReveal>
          <ScrollReveal delay={140}>
            <ButtonLink
              to="/courses"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {t('home.browse')}
            </ButtonLink>
          </ScrollReveal>
        </Stack>
        {enrollments.isPending ? (
          <ScrollReveal delay={120}>
            <ContinueLearningSkeleton />
          </ScrollReveal>
        ) : current ? (
          <ScrollReveal delay={120}>
            <ContinueLearningCard enrollment={current} />
          </ScrollReveal>
        ) : (
          <LearningHighlights />
        )}
      </Box>
    </HeroBand>
  );
}

const LEARNING_HIGHLIGHTS = ['languages', 'formats', 'progress'] as const;

function LearningHighlights() {
  const { t } = useTranslation('catalog');

  return (
    <ScrollReveal delay={120}>
      <Card
        component="section"
        aria-labelledby="home-learning-highlights"
        sx={{
          height: '100%',
          border: 1,
          borderColor: 'divider',
          boxShadow: 'none',
          bgcolor: 'background.paper',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
          <Stack spacing={2.5}>
            <Typography id="home-learning-highlights" variant="h5" component="h2">
              {t('guest.highlights.title')}
            </Typography>
            <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {LEARNING_HIGHLIGHTS.map((id, index) => (
                <ScrollReveal key={id} component="li" delay={index * 70}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <CheckCircleOutlined
                      aria-hidden
                      sx={{ mt: 0.25, flexShrink: 0, color: 'primary.main' }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                        {t(`guest.highlights.${id}.title`)}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.65, overflowWrap: 'anywhere' }}
                      >
                        {t(`guest.highlights.${id}.body`)}
                      </Typography>
                    </Box>
                  </Stack>
                </ScrollReveal>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
