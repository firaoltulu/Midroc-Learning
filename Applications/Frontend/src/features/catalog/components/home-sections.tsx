import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ErrorState } from '../../../shared/ui/error-state';
import { RouterLink } from '../../../shared/ui/router-links';
import { CardGridSkeleton, LoadingRegion } from '../../../shared/ui/skeletons';
import { categoriesQueryOptions, courseShelfQueryOptions } from '../api/catalog';
import { publicCategoriesQueryOptions, publicShelfQueryOptions } from '../api/public-catalog';
import type { CatalogSearch } from '../schemas/search';
import { CourseCard } from './course-card';

/** "New and popular" tabs: the catalog query each one shows, and its "See all" link. */
const SHELVES = {
  popular: { sort: 'popular' },
  newest: { sort: 'newest' },
  amharic: { language: 'am', sort: 'popular' },
} as const satisfies Record<string, Pick<CatalogSearch, 'language' | 'sort'>>;

type Shelf = keyof typeof SHELVES;
const SHELF_IDS = Object.keys(SHELVES) as Shelf[];

/** One shelf's courses: the signed-in catalog, or the public one for guests. */
function useShelf(filters: Pick<CatalogSearch, 'language' | 'sort'>, guest: boolean) {
  const signedIn = useQuery({ ...courseShelfQueryOptions(filters), enabled: !guest });
  const visitor = useQuery({ ...publicShelfQueryOptions(filters), enabled: guest });
  return guest ? visitor : signedIn;
}

/**
 * "New and popular" (most popular / new / Amharic). `guest`: the signed-out catalog
 * (GET /public/courses); its links lead to sign-in first.
 */
export function NewAndPopular({ guest = false }: { guest?: boolean }) {
  const { t } = useTranslation('catalog');
  const errorMessage = useErrorMessage();
  const [shelf, setShelf] = useState<Shelf>('popular');
  const courses = useShelf(SHELVES[shelf], guest);

  return (
    <Stack component="section" aria-labelledby="new-and-popular" spacing={2.5}>
      <Stack
        direction="row"
        useFlexGap
        sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <Typography id="new-and-popular" variant="h3" component="h2">
          {t('home.shelf.title')}
        </Typography>
        <RouterLink to="/courses" search={SHELVES[shelf]} sx={{ fontWeight: 600 }}>
          {t('home.shelf.seeAll')}
        </RouterLink>
      </Stack>
      <ToggleButtonGroup
        exclusive
        value={shelf}
        aria-label={t('home.shelf.label')}
        onChange={(_event, next: Shelf | null) => {
          if (next) setShelf(next);
        }}
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiToggleButtonGroup-grouped': {
            m: 0,
            border: 1,
            borderColor: 'primary.main',
            borderRadius: '10px !important',
            color: 'primary.main',
            fontWeight: 600,
            px: 2,
            minHeight: 40,
            '&.Mui-selected, &.Mui-selected:hover': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            },
          },
        }}
      >
        {SHELF_IDS.map((id) => (
          <ToggleButton key={id} value={id}>
            {t(`home.shelf.${id}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {courses.isPending ? (
        <CardGridSkeleton count={4} />
      ) : courses.isError ? (
        <ErrorState
          description={errorMessage(courses.error)}
          onRetry={() => void courses.refetch()}
        />
      ) : courses.data.items.length === 0 ? (
        <Typography color="text.secondary">{t('home.shelf.empty')}</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {courses.data.items.map((course) => (
            <CourseCard key={course.id} course={course} headingLevel="h3" />
          ))}
        </Box>
      )}
    </Stack>
  );
}

/** "Explore categories" with course counts; hidden when no course has a category. */
export function ExploreCategories({ guest = false }: { guest?: boolean }) {
  const { t } = useTranslation('catalog');
  const errorMessage = useErrorMessage();
  const signedIn = useQuery({ ...categoriesQueryOptions(), enabled: !guest });
  const visitor = useQuery({ ...publicCategoriesQueryOptions(), enabled: guest });
  const categories = guest ? visitor : signedIn;

  // No published categories yet: nothing to explore, so no section.
  if (categories.data?.length === 0) return null;

  return (
    <Stack component="section" aria-labelledby="explore-categories" spacing={2.5}>
      <Typography id="explore-categories" variant="h3" component="h2">
        {t('home.categories.title')}
      </Typography>
      {categories.isPending ? (
        <LoadingRegion>
          <CategoryGrid>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={76} />
            ))}
          </CategoryGrid>
        </LoadingRegion>
      ) : categories.isError ? (
        <ErrorState
          description={errorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <CategoryGrid component="ul">
          {categories.data.map((category) => (
            <Box component="li" key={category.name} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  position: 'relative',
                  flex: 1,
                  px: 2,
                  py: 1.75,
                  transition: (theme) => theme.transitions.create('border-color'),
                  '&:hover': { borderColor: 'text.secondary' },
                  '&:has(a:focus-visible)': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '2px',
                  },
                }}
              >
                <RouterLink
                  to="/courses"
                  search={{ category: category.name }}
                  underline="none"
                  color="inherit"
                  sx={{
                    display: 'block',
                    fontWeight: 600,
                    overflowWrap: 'anywhere',
                    '&::after': { content: '""', position: 'absolute', inset: 0 },
                    '&:focus-visible': { outline: 'none' },
                  }}
                >
                  {category.name}
                </RouterLink>
                <Typography variant="body2" color="text.secondary">
                  {t('home.categories.count', { count: category.courseCount })}
                </Typography>
              </Card>
            </Box>
          ))}
        </CategoryGrid>
      )}
    </Stack>
  );
}

function CategoryGrid({
  children,
  component = 'div',
}: {
  children: ReactNode;
  component?: 'div' | 'ul';
}) {
  return (
    <Box
      component={component}
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(6, minmax(0, 1fr))',
        },
      }}
    >
      {children}
    </Box>
  );
}
