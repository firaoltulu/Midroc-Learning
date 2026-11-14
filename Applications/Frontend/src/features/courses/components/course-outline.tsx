import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { ListItemLink } from '../../../shared/ui/router-links';
import type { CourseDetail } from '../api/schemas';
import { ITEM_ICONS } from './item-icons';

export interface CourseOutlineProps {
  course: CourseDetail;
  /** Items open the player (enrolled learners and the owner). */
  linkItems: boolean;
}

/**
 * The syllabus: one outlined box of modules ("Module 1 · Foundations", item count), the first
 * open; items show their type ("Video · Welcome"), an icon and completion.
 */
export function CourseOutline({ course, linkItems }: CourseOutlineProps) {
  const { t } = useTranslation('courses');
  const contentLang = useContentLang(course.language);
  const done = new Set(course.completedItemIds);
  const itemCount = course.modules.reduce((sum, module) => sum + module.items.length, 0);

  return (
    <Stack component="section" aria-labelledby="course-outline-heading" spacing={2}>
      <Stack spacing={0.5}>
        <Typography id="course-outline-heading" variant="h3" component="h2">
          {t('outline.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('outline.summary', {
            modules: t('meta.modules', { count: course.modules.length }),
            items: t('outline.items', { count: itemCount }),
          })}
        </Typography>
      </Stack>

      {/* One outlined box; modules are separated by thin lines (no shadows). */}
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          '& .MuiAccordion-root': { boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' },
          '& .MuiAccordion-root::before': { display: 'none' },
          '& .MuiAccordion-root + .MuiAccordion-root': { borderTop: 1, borderColor: 'divider' },
        }}
      >
        {course.modules.map((module, index) => (
          <Accordion key={module.id} defaultExpanded={index === 0} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreOutlined />} sx={{ px: 2 }}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <Typography component="span" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {t('outline.moduleNumber', { number: index + 1 })}
                  <Box component="span" aria-hidden sx={{ mx: 0.75 }}>
                    ·
                  </Box>
                  <span {...contentLang}>{module.title}</span>
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ flexShrink: 0 }}
                >
                  {t('outline.items', { count: module.items.length })}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {module.description ? (
                <Typography
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 1, maxWidth: 720 }}
                  {...contentLang}
                >
                  {module.description}
                </Typography>
              ) : null}
              <List disablePadding>
                {module.items.map((item) => {
                  const Icon = ITEM_ICONS[item.type];
                  const completed = done.has(item.id);
                  const content = (
                    <>
                      <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                        <Icon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <>
                            <Box component="span" sx={{ color: 'text.secondary' }}>
                              {t(`itemType.${item.type}`)}
                              <Box component="span" aria-hidden sx={{ mx: 0.75 }}>
                                ·
                              </Box>
                              <Box component="span" sx={visuallyHidden}>
                                {': '}
                              </Box>
                            </Box>
                            <span {...contentLang}>{item.title}</span>
                          </>
                        }
                        slotProps={{ primary: { sx: { overflowWrap: 'anywhere' } } }}
                      />
                      {completed ? (
                        <CheckCircleOutlined
                          titleAccess={t('outline.completed')}
                          sx={{ color: 'success.main', ml: 1, flexShrink: 0 }}
                        />
                      ) : null}
                    </>
                  );
                  // A link can't be a list item itself: only <li> may sit in a <ul>.
                  return linkItems ? (
                    <li key={item.id}>
                      <ListItemLink
                        to="/learn/$courseId/$itemId"
                        params={{ courseId: course.id, itemId: item.id }}
                        sx={{ borderRadius: '10px', minHeight: 44 }}
                      >
                        {content}
                      </ListItemLink>
                    </li>
                  ) : (
                    <ListItem key={item.id} sx={{ minHeight: 44 }}>
                      {content}
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Stack>
  );
}
