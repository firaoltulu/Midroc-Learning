import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
 * The syllabus: distinct module cards, the first open; items show their type, icon and completion.
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

      <Stack spacing={1.25}>
        {course.modules.map((module, index) => (
          <Accordion
            key={module.id}
            defaultExpanded={index === 0}
            disableGutters
            sx={(theme) => ({
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              borderRadius: '14px !important',
              bgcolor: 'background.paper',
              boxShadow: 'none',
              transition: theme.transitions.create(['border-color', 'box-shadow'], {
                duration: theme.transitions.duration.short,
              }),
              '&::before': { display: 'none' },
              '&.Mui-expanded': { m: 0, borderColor: 'primary.main' },
              '@media (hover: hover)': {
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 3px rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
                },
              },
            })}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreOutlined />}
              sx={{
                minHeight: 84,
                px: { xs: 1.5, sm: 2 },
                '&.Mui-expanded': { minHeight: 84 },
                '& .MuiAccordionSummary-content': { my: 1.5, alignItems: 'center', minWidth: 0 },
                '& .MuiAccordionSummary-content.Mui-expanded': { my: 1.5 },
                '&.Mui-focusVisible': { bgcolor: 'surfaceMuted' },
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 1.5, sm: 2 }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack
                  direction="row"
                  spacing={{ xs: 1.5, sm: 2 }}
                  sx={{ alignItems: 'center', minWidth: 0 }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1.25,
                      bgcolor: 'surfaceMuted',
                      color: 'primary.main',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </Box>
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: 'primary.main', fontWeight: 700 }}
                    >
                      {t('outline.moduleNumber', { number: index + 1 })}
                    </Typography>
                    <Typography component="span" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                      <span {...contentLang}>{module.title}</span>
                    </Typography>
                  </Stack>
                </Stack>
                <Chip
                  label={t('outline.items', { count: module.items.length })}
                  size="small"
                  variant="outlined"
                  sx={{
                    flexShrink: 0,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                pt: 1.5,
                px: { xs: 1.5, sm: 2 },
                pb: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'surfaceMuted',
              }}
            >
              {module.description ? (
                <Typography
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    mb: 1.5,
                    maxWidth: 720,
                  }}
                  {...contentLang}
                >
                  {module.description}
                </Typography>
              ) : null}
              <List disablePadding sx={{ display: 'grid', gap: 0.75 }}>
                {module.items.map((item) => {
                  const Icon = ITEM_ICONS[item.type];
                  const completed = done.has(item.id);
                  const content = (
                    <>
                      <ListItemIcon
                        sx={{
                          minWidth: 34,
                          width: 34,
                          height: 34,
                          mr: 1.5,
                          display: 'grid',
                          placeItems: 'center',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                          color: 'primary.main',
                          fontSize: '1.125rem',
                          '& .MuiSvgIcon-root': { fontSize: 'inherit' },
                        }}
                      >
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
                        slotProps={{
                          primary: { sx: { overflowWrap: 'anywhere', fontWeight: 500 } },
                        }}
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
                        sx={(theme) => ({
                          minHeight: 56,
                          px: 1.25,
                          border: 1,
                          borderColor: 'transparent',
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          transition: theme.transitions.create(
                            ['border-color', 'box-shadow', 'background-color'],
                            { duration: theme.transitions.duration.short },
                          ),
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow:
                              '0 0 0 2px rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
                          },
                        })}
                      >
                        {content}
                      </ListItemLink>
                    </li>
                  ) : (
                    <ListItem
                      key={item.id}
                      sx={{
                        minHeight: 56,
                        px: 1.25,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      {content}
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Stack>
  );
}
