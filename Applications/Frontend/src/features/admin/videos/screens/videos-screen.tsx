import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import VideocamOffOutlined from '@mui/icons-material/VideocamOffOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
import { SearchField } from '../../../../shared/ui/search-field';
import {
  unavailableVideosQueryOptions,
  useRunYoutubeCheck,
  type YoutubeCheckResult,
} from '../api/videos';

export const VIDEOS_PAGE_SIZE = 20;

export interface VideosSearch {
  q?: string;
  page?: number;
}

export interface VideosScreenProps {
  search: VideosSearch;
  onSearchChange: (next: VideosSearch, options?: { replace?: boolean }) => void;
}

/** /admin/videos: videos YouTube reports as unavailable, and "Run check now". */
export function VideosScreen({ search, onSearchChange }: VideosScreenProps) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const { formatRelative, formatDateTime } = useDateFormat();
  const videos = useQuery(unavailableVideosQueryOptions());
  const check = useRunYoutubeCheck();

  // The list is short and unpaginated on the server: search and pages work here.
  const matching = useMemo(() => {
    const query = search.q?.toLocaleLowerCase();
    if (!videos.data || !query) return videos.data;
    return videos.data.filter((video) =>
      [
        video.courseTitle,
        video.itemTitle,
        video.youtubeTitle ?? '',
        video.ownerName ?? '',
        video.ownerEmail,
      ].some((text) => text.toLocaleLowerCase().includes(query)),
    );
  }, [videos.data, search.q]);
  const page = search.page ?? 1;
  const rows = matching?.slice((page - 1) * VIDEOS_PAGE_SIZE, page * VIDEOS_PAGE_SIZE);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('videos.title')}
        description={t('videos.description')}
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshOutlined />}
            loading={check.isPending}
            onClick={() => {
              check.mutate();
            }}
          >
            {t('videos.runCheck')}
          </Button>
        }
      />
      <Box aria-live="polite">
        {check.isSuccess ? <CheckSummary result={check.data} /> : null}
        {check.isError ? (
          <Alert
            severity={isApiError(check.error, 'JOB_ALREADY_RUNNING') ? 'info' : 'error'}
            variant="outlined"
          >
            {errorMessage(check.error)}
          </Alert>
        ) : null}
      </Box>
      <Box role="search" aria-label={t('filters.label')}>
        <SearchField
          label={t('videos.search')}
          value={search.q}
          onChange={(q) => {
            onSearchChange({ q, page: undefined }, { replace: true });
          }}
          sx={{ width: { xs: '100%', sm: 360 } }}
        />
      </Box>
      <DataTable
        label={t('videos.title')}
        rows={rows}
        rowKey={(video) => video.itemId}
        loading={videos.isPending}
        error={videos.error}
        onRetry={() => void videos.refetch()}
        pagination={
          matching
            ? {
                page,
                pageSize: VIDEOS_PAGE_SIZE,
                total: matching.length,
                onPageChange: (next) => {
                  onSearchChange({ ...search, page: next === 1 ? undefined : next });
                },
              }
            : undefined
        }
        empty={
          <EmptyState
            icon={<VideocamOffOutlined />}
            title={t(search.q ? 'videos.noMatches' : 'videos.empty')}
            description={t(search.q ? 'videos.noMatchesBody' : 'videos.emptyBody')}
          />
        }
        columns={[
          {
            key: 'course',
            header: t('columns.course'),
            rowHeader: true,
            cell: (video) => (
              <RouterLink to="/admin/courses/$courseId" params={{ courseId: video.courseId }}>
                {video.courseTitle}
              </RouterLink>
            ),
          },
          {
            key: 'item',
            header: t('columns.video'),
            cell: (video) => (
              <>
                {video.itemTitle}
                {video.youtubeTitle ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'block' }}
                  >
                    {t('videos.onYoutube', { title: video.youtubeTitle })}
                  </Typography>
                ) : null}
              </>
            ),
          },
          {
            key: 'owner',
            header: t('columns.owner'),
            hideBelow: 'sm',
            cell: (video) => (
              <>
                {video.ownerName ?? video.ownerEmail}
                {video.ownerName ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'block' }}
                  >
                    {video.ownerEmail}
                  </Typography>
                ) : null}
              </>
            ),
          },
          {
            key: 'checked',
            header: t('columns.lastChecked'),
            hideBelow: 'md',
            cell: (video) =>
              video.lastCheckedAt ? (
                <span title={formatDateTime(video.lastCheckedAt)}>
                  {formatRelative(video.lastCheckedAt)}
                </span>
              ) : (
                t('videos.neverChecked')
              ),
          },
        ]}
      />
    </Stack>
  );
}

function CheckSummary({ result }: { result: YoutubeCheckResult }) {
  const { t } = useTranslation('admin');
  const { formatNumber } = useNumberFormat();
  const figures = [
    ['checked', result.checked],
    ['available', result.available],
    ['newlyUnavailable', result.newlyUnavailable],
    ['stillUnavailable', result.stillUnavailable],
    ['recovered', result.recovered],
    ['unreachable', result.unreachable],
  ] as const;
  return (
    <Alert severity={result.aborted ? 'warning' : 'success'} variant="outlined">
      <AlertTitle>
        {t(result.aborted ? 'videos.summary.aborted' : 'videos.summary.done')}
      </AlertTitle>
      <Box
        component="dl"
        sx={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 3, rowGap: 0.5, m: 0 }}
      >
        {figures.map(([key, value]) => (
          <Box key={key} sx={{ display: 'contents' }}>
            <Box component="dt">{t(`videos.summary.${key}`)}</Box>
            <Box component="dd" sx={{ m: 0, fontWeight: 600 }}>
              {formatNumber(value)}
            </Box>
          </Box>
        ))}
      </Box>
    </Alert>
  );
}
