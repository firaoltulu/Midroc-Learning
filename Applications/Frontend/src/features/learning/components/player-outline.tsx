import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { ListItemLink } from '../../../shared/ui/router-links';
import { ITEM_ICONS, type CourseDetail } from '../../courses';

/**
 * The course's modules and items. Type and progress icons accompany accessible text labels.
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
  const instanceId = useId();
  const activeModuleId = course.modules.find((module) =>
    module.items.some((item) => item.id === currentItemId),
  )?.id;
  const [outlineState, setOutlineState] = useState(() => ({
    activeModuleId,
    expandedModules: new Set(course.modules.map((module) => module.id)),
  }));
  if (activeModuleId && outlineState.activeModuleId !== activeModuleId) {
    setOutlineState((previous) => ({
      activeModuleId,
      expandedModules: new Set(previous.expandedModules).add(activeModuleId),
    }));
  }

  return (
    <Box component="nav" aria-label={t('learning:player.outline')}>
      {course.modules.map((module, index) => (
        <Accordion
          key={module.id}
          expanded={outlineState.expandedModules.has(module.id)}
          onChange={(_event, expanded) => {
            setOutlineState((previous) => {
              const next = new Set(previous.expandedModules);
              if (expanded) next.add(module.id);
              else next.delete(module.id);
              return { ...previous, expandedModules: next };
            });
          }}
          disableGutters
          sx={{
            mb: 1.25,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            borderRadius: '12px !important',
            bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.62)',
            boxShadow: 'none',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { m: '0 0 10px', borderColor: 'primary.main' },
          }}
        >
          <AccordionSummary
            id={`${instanceId}-module-${module.id}-summary`}
            aria-controls={`${instanceId}-module-${module.id}-panel`}
            expandIcon={<ExpandMoreOutlined />}
            sx={{
              minHeight: 68,
              px: 1.25,
              '&.Mui-expanded': { minHeight: 68 },
              '& .MuiAccordionSummary-content': { my: 1, minWidth: 0 },
              '& .MuiAccordionSummary-content.Mui-expanded': { my: 1 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1.25,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="div"
                  variant="caption"
                  sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.25 }}
                >
                  {t('courses:outline.moduleNumber', { number: index + 1 })}
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 700,
                    lineHeight: 1.4,
                    overflowWrap: 'anywhere',
                  }}
                  {...contentLang}
                >
                  {module.title}
                </Typography>
              </Box>
              <Chip
                label={t('courses:outline.items', { count: module.items.length })}
                size="small"
                variant="outlined"
                sx={{
                  ml: 'auto',
                  flexShrink: 0,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails
            id={`${instanceId}-module-${module.id}-panel`}
            aria-labelledby={`${instanceId}-module-${module.id}-summary`}
            sx={{ px: 1, pt: 0, pb: 1 }}
          >
            <List
              dense
              aria-labelledby={`${instanceId}-module-${module.id}-summary`}
              sx={{ display: 'grid', gap: 0.5, py: 0 }}
            >
              {module.items.map((item) => {
                const TypeIcon = ITEM_ICONS[item.type];
                const current = item.id === currentItemId;
                const completed = done.has(item.id);
                const Icon = completed
                  ? CheckCircleOutlined
                  : current
                    ? PlayArrowOutlined
                    : TypeIcon;
                return (
                  <li key={item.id}>
                    <ListItemLink
                      to="/learn/$courseId/$itemId"
                      params={{ courseId: course.id, itemId: item.id }}
                      selected={current}
                      aria-current={current ? 'page' : undefined}
                      onClick={onNavigate}
                      sx={(theme) => ({
                        borderRadius: '10px',
                        minHeight: 44,
                        px: 1.5,
                        border: 1,
                        borderColor: 'transparent',
                        color: completed
                          ? 'primary.main'
                          : current
                            ? 'text.primary'
                            : 'text.secondary',
                        fontWeight: current ? 700 : 400,
                        transition: theme.transitions.create(
                          ['transform', 'border-color', 'box-shadow', 'background-color'],
                          { duration: theme.transitions.duration.short },
                        ),
                        '&.Mui-selected, &.Mui-selected:hover': {
                          bgcolor: 'surfaceMuted',
                          borderColor: 'primary.main',
                        },
                        '@media (hover: hover)': {
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            bgcolor: 'background.paper',
                            borderColor: 'primary.main',
                            boxShadow:
                              '0 5px 14px rgba(var(--mui-palette-primary-mainChannel) / 0.16)',
                          },
                        },
                      })}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        <Box
                          aria-hidden
                          sx={{
                            width: 32,
                            height: 32,
                            display: 'grid',
                            placeItems: 'center',
                            border: 1,
                            borderColor: current ? 'primary.main' : 'divider',
                            borderRadius: 1.25,
                            bgcolor: current
                              ? 'primary.main'
                              : completed
                                ? 'surfaceMuted'
                                : 'background.paper',
                            color: current
                              ? 'primary.contrastText'
                              : completed
                                ? 'success.main'
                                : 'text.secondary',
                            '& .MuiSvgIcon-root': { fontSize: 18 },
                          }}
                        >
                          <Icon />
                        </Box>
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
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
