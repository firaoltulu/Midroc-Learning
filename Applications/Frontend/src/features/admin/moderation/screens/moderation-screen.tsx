import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
import { moderationQueueQueryOptions } from '../api/moderation';

export type ModerationTab = 'courses' | 'revisions';

const TABS: ModerationTab[] = ['courses', 'revisions'];

export interface ModerationSearch {
  tab?: ModerationTab;
}

export interface ModerationScreenProps {
  search: ModerationSearch;
  onSearchChange: (next: ModerationSearch) => void;
}

/** /admin/moderation: courses awaiting review and pending revisions, oldest first. */
export function ModerationScreen({ search, onSearchChange }: ModerationScreenProps) {
  const { t } = useTranslation(['admin', 'common']);
  const { formatNumber } = useNumberFormat();
  const { formatDateTime, formatRelative } = useDateFormat();
  const queue = useQuery(moderationQueueQueryOptions());
  const tab: ModerationTab = search.tab ?? 'courses';
  const baseId = useId();
  const tabId = (value: ModerationTab) => `${baseId}-tab-${value}`;
  const panelId = (value: ModerationTab) => `${baseId}-panel-${value}`;
  const count = (value: ModerationTab) =>
    queue.data ? formatNumber(queue.data[value].length) : null;

  const submitted = (date: string) => (
    <span title={formatDateTime(date)}>{formatRelative(date)}</span>
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('moderation.title')} description={t('moderation.description')} />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, value: ModerationTab) => {
            onSearchChange({ tab: value === 'courses' ? undefined : value });
          }}
          aria-label={t('moderation.tabsLabel')}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {TABS.map((value) => (
            <Tab
              key={value}
              value={value}
              id={tabId(value)}
              aria-controls={panelId(value)}
              label={
                count(value) === null
                  ? t(`moderation.tabs.${value}`)
                  : t('moderation.tabWithCount', {
                      label: t(`moderation.tabs.${value}`),
                      number: count(value),
                    })
              }
            />
          ))}
        </Tabs>
      </Box>
      <Box role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
        {tab === 'courses' ? (
          <DataTable
            label={t('moderation.tabs.courses')}
            rows={queue.data?.courses}
            rowKey={(course) => course.id}
            loading={queue.isPending}
            error={queue.error}
            onRetry={() => void queue.refetch()}
            empty={
              <EmptyState
                icon={<FactCheckOutlined />}
                title={t('moderation.emptyCourses')}
                description={t('moderation.emptyBody')}
              />
            }
            columns={[
              {
                key: 'title',
                header: t('columns.course'),
                rowHeader: true,
                cell: (course) => (
                  <RouterLink
                    to="/admin/moderation/courses/$courseId"
                    params={{ courseId: course.id }}
                  >
                    {course.title}
                  </RouterLink>
                ),
              },
              {
                key: 'owner',
                header: t('columns.owner'),
                cell: (course) => (
                  <>
                    {course.ownerName ?? course.ownerEmail}
                    {course.ownerName ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{ display: 'block' }}
                      >
                        {course.ownerEmail}
                      </Typography>
                    ) : null}
                  </>
                ),
              },
              {
                key: 'language',
                header: t('columns.language'),
                hideBelow: 'md',
                cell: (course) => t(`common:languages.${course.language}`),
              },
              {
                key: 'submitted',
                header: t('columns.submitted'),
                cell: (course) => submitted(course.updatedAt),
              },
            ]}
          />
        ) : (
          <DataTable
            label={t('moderation.tabs.revisions')}
            rows={queue.data?.revisions}
            rowKey={(revision) => revision.id}
            loading={queue.isPending}
            error={queue.error}
            onRetry={() => void queue.refetch()}
            empty={
              <EmptyState
                icon={<FactCheckOutlined />}
                title={t('moderation.emptyRevisions')}
                description={t('moderation.emptyBody')}
              />
            }
            columns={[
              {
                key: 'title',
                header: t('columns.course'),
                rowHeader: true,
                cell: (revision) => (
                  <RouterLink
                    to="/admin/moderation/revisions/$revisionId"
                    params={{ revisionId: revision.id }}
                  >
                    {revision.courseTitle}
                  </RouterLink>
                ),
              },
              {
                key: 'owner',
                header: t('columns.owner'),
                cell: (revision) => revision.ownerName ?? t('review.noOwnerName'),
              },
              {
                key: 'submitted',
                header: t('columns.submitted'),
                cell: (revision) => submitted(revision.submittedAt),
              },
            ]}
          />
        )}
      </Box>
    </Stack>
  );
}
