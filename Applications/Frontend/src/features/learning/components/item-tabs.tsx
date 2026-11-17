import ForumOutlined from '@mui/icons-material/ForumOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useId, useState, type ReactElement } from 'react';
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

  const icons = {
    overview: <InfoOutlined />,
    discussions: <ForumOutlined />,
    notes: <NotesOutlined />,
  } satisfies Record<TabId, ReactElement>;

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
        sx={{
          width: 'fit-content',
          maxWidth: '100%',
          minHeight: 52,
          p: 0.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
          bgcolor: 'surfaceMuted',
          '& .MuiTabs-flexContainer': { gap: 0.5 },
          '& .MuiTabs-indicator': {
            top: 4,
            bottom: 4,
            height: 'auto',
            borderRadius: '10px',
            bgcolor: 'primary.main',
            boxShadow: '0 3px 8px rgba(var(--mui-palette-primary-mainChannel) / 0.2)',
          },
        }}
      >
        {TABS.map((id) => (
          <Tab
            key={id}
            value={id}
            label={label(id)}
            icon={icons[id]}
            iconPosition="start"
            id={`${baseId}-tab-${id}`}
            aria-controls={`${baseId}-panel-${id}`}
            sx={{
              zIndex: 1,
              minWidth: { xs: 112, sm: 132 },
              minHeight: 44,
              px: { xs: 1.5, sm: 2 },
              borderRadius: '10px',
              color: 'text.secondary',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: (theme) =>
                theme.transitions.create(['color', 'background-color'], {
                  duration: theme.transitions.duration.short,
                }),
              '&.Mui-selected': { color: 'primary.contrastText' },
              '&:hover:not(.Mui-selected)': { bgcolor: 'action.hover', color: 'text.primary' },
              '& .MuiTab-icon': { fontSize: 19, mr: 1 },
            }}
          />
        ))}
      </Tabs>
      <Box
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        sx={{ pt: 2.5 }}
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
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={t('learning:player.position', {
            module: nav.item.moduleTitle,
            position: nav.position,
            total: nav.total,
          })}
          sx={{ bgcolor: 'surfaceMuted', fontWeight: 600 }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t(`courses:itemType.${nav.item.type}`)}
          sx={{ borderColor: 'divider', color: 'text.secondary' }}
        />
      </Stack>
      {module?.description ? (
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderLeft: 3,
            borderColor: 'primary.main',
            borderRadius: '0 12px 12px 0',
            bgcolor: 'surfaceMuted',
          }}
        >
          <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} {...contentLang}>
            {module.description}
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
