import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HeroBand } from '../../../shared/ui/hero-band';
import { ButtonLink } from '../../../shared/ui/router-links';
import { enrollmentsQueryOptions } from '../../learning';
import {
  ContinueLearningCard,
  ContinueLearningSkeleton,
} from '../components/continue-learning-card';
import { ExploreCategories, NewAndPopular } from '../components/home-sections';
import { pickContinueCourse } from '../lib/continue-course';

/**
 * `/`: the green hero (headline, Browse courses, and the course to continue), "New and
 * popular" (most popular / new / Amharic) and "Explore categories" with course counts.
 */
export function HomeScreen() {
  return (
    <>
      <Hero />
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={{ xs: 5, md: 7 }}>
          <NewAndPopular />
          <ExploreCategories />
        </Stack>
      </Container>
    </>
  );
}

function Hero() {
  const { t } = useTranslation('catalog');
  const enrollments = useQuery(enrollmentsQueryOptions());
  const current = enrollments.data ? pickContinueCourse(enrollments.data) : undefined;
  // The card's place stays reserved while loading, so the headline doesn't jump.
  const showCard = enrollments.isPending || Boolean(current);

  return (
    <HeroBand>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 4, md: 6 },
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr', md: showCard ? '1.2fr 1fr' : '1fr' },
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: 'flex-start', maxWidth: 640 }}>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, lineHeight: 1.15 }}
          >
            {t('home.title')}
          </Typography>
          <Typography sx={{ color: 'hero.fgMuted', fontSize: '1.125rem' }}>
            {t('home.subtitle')}
          </Typography>
          <ButtonLink
            to="/courses"
            variant="contained"
            size="large"
            // Inverted on the band (light button, band-green text) in both schemes.
            sx={{
              bgcolor: 'hero.fg',
              color: 'hero.bg',
              '&:hover': { bgcolor: 'hero.fgMuted' },
            }}
          >
            {t('home.browse')}
          </ButtonLink>
        </Stack>
        {enrollments.isPending ? (
          <ContinueLearningSkeleton />
        ) : current ? (
          <ContinueLearningCard enrollment={current} />
        ) : null}
      </Box>
    </HeroBand>
  );
}
