import CheckOutlined from '@mui/icons-material/CheckOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { ListItemLink } from '../../../shared/ui/router-links';
import { ITEM_ICONS, type CourseDetail } from '../../courses';

/**
 * The course's modules ("Module 1 · Foundations") and items. Completed items show a check,
 * the current one a play mark on a tinted row, the others their type icon. The type and the
 * state are also in the accessible name, never only in the icon.
 */
export function PlayerOutline({
  course,
  currentItemId,
  onNavigate,
}: {
  course: CourseDetail;
  currentItemId: string;
  /** E.g. close the mobile drawer. */
  onNavigate?: () => void;
}) {
  const { t } = useTranslation(['learning', 'courses']);
  const contentLang = useContentLang(course.language);
  const done = new Set(course.completedItemIds);

  return (
    <Box component="nav" aria-label={t('learning:player.outline')}>
      {course.modules.map((module, index) => (
        <Box key={module.id} sx={{ mb: 1 }}>
          {/* The module title names its list (only <li> may sit directly inside a <ul>). */}
          <ListSubheader
            id={`outline-module-${module.id}`}
            component="div"
            disableSticky
            sx={{
              bgcolor: 'transparent',
              color: 'text.primary',
              lineHeight: 1.4,
              py: 1,
              px: 1.5,
              fontWeight: 700,
            }}
          >
            {t('courses:outline.moduleNumber', { number: index + 1 })}
            <Box component="span" aria-hidden sx={{ mx: 0.75 }}>
              ·
            </Box>
            <span {...contentLang}>{module.title}</span>
          </ListSubheader>
          <List dense aria-labelledby={`outline-module-${module.id}`} sx={{ py: 0 }}>
            {module.items.map((item) => {
              const TypeIcon = ITEM_ICONS[item.type];
              const current = item.id === currentItemId;
              const completed = done.has(item.id);
              const Icon = completed ? CheckOutlined : current ? PlayArrowOutlined : TypeIcon;
              return (
                <li key={item.id}>
                  <ListItemLink
                    to="/learn/$courseId/$itemId"
                    params={{ courseId: course.id, itemId: item.id }}
                    selected={current}
                    aria-current={current ? 'page' : undefined}
                    onClick={onNavigate}
                    sx={{
                      borderRadius: '10px',
                      minHeight: 44,
                      px: 1.5,
                      color: completed
                        ? 'primary.main'
                        : current
                          ? 'text.primary'
                          : 'text.secondary',
                      fontWeight: current ? 700 : 400,
                      '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'surfaceMuted' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 30, color: 'inherit' }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <>
                          <Box component="span" sx={visuallyHidden}>
                            {t('courses:outline.typePrefix', {
                              type: t(`courses:itemType.${item.type}`),
                            })}
                          </Box>
                          <span {...contentLang}>{item.title}</span>
                          {completed ? (
                            <Box component="span" sx={visuallyHidden}>
                              {`, ${t('courses:outline.completed')}`}
                            </Box>
                          ) : null}
                        </>
                      }
                      slotProps={{
                        primary: { sx: { overflowWrap: 'anywhere', fontWeight: 'inherit' } },
                      }}
                    />
                  </ListItemLink>
                </li>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
}
