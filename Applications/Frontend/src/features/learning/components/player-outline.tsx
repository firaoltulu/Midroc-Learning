import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
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

/** The course's modules and items; the current item is marked; completed ones are checked. */
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
      {course.modules.map((module) => (
        <List
          key={module.id}
          dense
          subheader={
            <ListSubheader
              component="div"
              disableSticky
              sx={{ bgcolor: 'transparent', lineHeight: 1.4, py: 1, fontWeight: 600 }}
              {...contentLang}
            >
              {module.title}
            </ListSubheader>
          }
        >
          {module.items.map((item) => {
            const Icon = ITEM_ICONS[item.type];
            const current = item.id === currentItemId;
            const completed = done.has(item.id);
            return (
              <ListItemLink
                key={item.id}
                to="/learn/$courseId/$itemId"
                params={{ courseId: course.id, itemId: item.id }}
                selected={current}
                aria-current={current ? 'page' : undefined}
                onClick={onNavigate}
                sx={{ borderRadius: '10px', minHeight: 44 }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                  <Icon />
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
                    </>
                  }
                  slotProps={{ primary: { sx: { overflowWrap: 'anywhere' } } }}
                />
                {completed ? (
                  <CheckCircleOutlined
                    titleAccess={t('courses:outline.completed')}
                    fontSize="small"
                    sx={{ color: 'success.main', ml: 1, flexShrink: 0 }}
                  />
                ) : null}
              </ListItemLink>
            );
          })}
        </List>
      ))}
    </Box>
  );
}
