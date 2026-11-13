import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { EmptyState } from '../../../shared/ui/empty-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink } from '../../../shared/ui/router-links';
import { CardGridSkeleton } from '../../../shared/ui/skeletons';
import { catalogQueryOptions } from '../api/catalog';
import { CatalogFilters, type CatalogFiltersProps } from '../components/catalog-filters';
import { CourseCard } from '../components/course-card';
import { hasFilters, type CatalogSearch } from '../schemas/search';

export interface CatalogScreenProps {
  /** The validated URL search params. */
  search: CatalogSearch;
  /** Updates the URL (the route wires this to navigate). */
  onSearchChange: CatalogFiltersProps['onChange'];
}

/** /courses: published courses with search, category and language filters and pages. */
export function CatalogScreen({ search, onSearchChange }: CatalogScreenProps) {
  const { t } = useTranslation('catalog');
  const errorMessage = useErrorMessage();
  const catalog = useQuery(catalogQueryOptions(search));
  const filtered = hasFilters(search);

  const pageCount = catalog.data ? Math.ceil(catalog.data.total / catalog.data.pageSize) : 0;

  return (
    <Stack spacing={3}>
      <PageHeader title={t('title')} description={t('description')} />
      <CatalogFilters search={search} onChange={onSearchChange} />

      {/* Announces the result count after each search or filter change. */}
      <Box aria-live="polite" sx={visuallyHidden}>
        {catalog.data && !catalog.isPlaceholderData
          ? t('results', { count: catalog.data.total })
          : ''}
      </Box>

      {catalog.isPending ? (
        <CardGridSkeleton />
      ) : catalog.isError ? (
        <ErrorState
          description={errorMessage(catalog.error)}
          onRetry={() => void catalog.refetch()}
        />
      ) : catalog.data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchOffOutlined />}
            title={t('empty.filtered.title')}
            description={t('empty.filtered.body')}
            action={
              <Button
                variant="outlined"
                onClick={() => {
                  onSearchChange({});
                }}
              >
                {t('filters.clear')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<SchoolOutlined />}
            title={t('empty.none.title')}
            description={t('empty.none.body')}
            action={
              <ButtonLink variant="outlined" to="/my-courses/new">
                {t('empty.none.action')}
              </ButtonLink>
            }
          />
        )
      ) : (
        <Stack spacing={3}>
          <Typography variant="body2" color="text.secondary" aria-hidden>
            {t('results', { count: catalog.data.total })}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              opacity: catalog.isPlaceholderData ? 0.6 : 1,
              transition: (theme) => theme.transitions.create('opacity'),
            }}
            aria-busy={catalog.isPlaceholderData}
          >
            {catalog.data.items.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </Box>
          {pageCount > 1 ? (
            <Pagination
              count={pageCount}
              page={Math.min(search.page ?? 1, pageCount)}
              onChange={(_event, page) => {
                onSearchChange({ ...search, page: page === 1 ? undefined : page });
                window.scrollTo({ top: 0 });
              }}
              shape="rounded"
              aria-label={t('pagination.label')}
              sx={{ alignSelf: 'center' }}
              getItemAriaLabel={(type, page, selected) => {
                switch (type) {
                  case 'page':
                    return t(selected ? 'pagination.current' : 'pagination.page', {
                      page: page ?? 0,
                    });
                  case 'first':
                  case 'last':
                  case 'next':
                  case 'previous':
                    return t(`pagination.${type}`);
                  default:
                    return ''; // Ellipses aren't interactive.
                }
              }}
            />
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
