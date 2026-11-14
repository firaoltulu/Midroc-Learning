import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import type { CourseDetail } from '../../courses';
import { threadsQueryOptions } from '../api/discussions';
import { notesQueryOptions } from '../api/notes';
import type { PlayerNavigation } from '../model/player-navigation';
import { DiscussionsPanel } from './discussions-panel';
import { NotesPanel } from './notes-panel';

const TABS = ['overview', 'discussions', 'notes'] as const;
type TabId = (typeof TABS)[number];

/**
 * Overview / Discussions (N) / Notes (N) under the item. The counts load with the player; each
 * panel's content loads when it opens.
 */
export function ItemTabs({
  course,
  nav,
  canModerate,
}: {
  course: CourseDetail;
  nav: PlayerNavigation;
  canModerate: boolean;
}) {
  const { t } = useTranslation('learning');
  const [tab, setTab] = useState<TabId>('overview');
  const baseId = useId();
  const itemId = nav.item.id;
  const threads = useInfiniteQuery(threadsQueryOptions(itemId));
  const notes = useQuery(notesQueryOptions(itemId));
  const threadCount = threads.data?.pages[0]?.total;
  const noteCount = notes.data?.length;

  const label = (id: TabId) => {
    if (id === 'discussions' && threadCount !== undefined) {
      return t('tabs.discussionsCount', { count: threadCount });
    }
    if (id === 'notes' && noteCount !== undefined)
      return t('tabs.notesCount', { count: noteCount });
    return t(`tabs.${id}`);
  };

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_event, value: TabId) => {
          setTab(value);
        }}
        aria-label={t('tabs.label')}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((id) => (
          <Tab
            key={id}
            value={id}
            label={label(id)}
            id={`${baseId}-tab-${id}`}
            aria-controls={`${baseId}-panel-${id}`}
            sx={{ minHeight: 48, px: { xs: 1.5, sm: 2 } }}
          />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        sx={{ pt: 3 }}
      >
        {tab === 'overview' ? (
          <Overview course={course} nav={nav} />
        ) : tab === 'discussions' ? (
          <DiscussionsPanel
            itemId={itemId}
            canPost={course.status === 'published'}
            canModerate={canModerate}
          />
        ) : (
          <NotesPanel itemId={itemId} />
        )}
      </Box>
    </Box>
  );
}

function Overview({ course, nav }: { course: CourseDetail; nav: PlayerNavigation }) {
  const { t } = useTranslation(['learning', 'courses']);
  const contentLang = useContentLang(course.language);
  const module = course.modules.find((entry) =>
    entry.items.some((item) => item.id === nav.item.id),
  );

  return (
    <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
      <Typography color="text.secondary">
        {t('learning:player.position', {
          module: nav.item.moduleTitle,
          position: nav.position,
          total: nav.total,
        })}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t(`courses:itemType.${nav.item.type}`)}
      </Typography>
      {module?.description ? (
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} {...contentLang}>
          {module.description}
        </Typography>
      ) : null}
    </Stack>
  );
}
