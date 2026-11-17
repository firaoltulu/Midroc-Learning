import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import type { CourseDetail } from '../../courses';
import { PLAYER_BAR_HEIGHT } from '../model/player-layout';

/**
 * The player's own slim bar (the app header is hidden here): the mark, the course title,
 * "N% complete", the outline button on small screens and "Back to course".
 */
export function PlayerTopBar({
  course,
  percent,
  onOpenOutline,
}: {
  course: CourseDetail;
  percent: number;
  onOpenOutline: () => void;
}) {
  const { t } = useTranslation(['learning', 'common']);
  const contentLang = useContentLang(course.language);

  return (
    <Stack
      component="header"
      direction="row"
      useFlexGap
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: PLAYER_BAR_HEIGHT,
        minHeight: PLAYER_BAR_HEIGHT,
        alignItems: 'center',
        px: { xs: 1.25, sm: 2.5, lg: 3.5 },
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        gap: { xs: 1, sm: 2 },
      }}
    >
      <RouterLink
        to="/"
        aria-label={t('common:brand.homeLink')}
        sx={{
          width: 58,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1.5,
          flexShrink: 0,
        }}
      >
        <BrandLogo variant="mark" height={28} decorative />
      </RouterLink>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="p"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.9375rem', sm: '1rem' },
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          {...contentLang}
        >
          {course.title}
        </Typography>
      </Box>
      <Stack
        spacing={0.5}
        sx={{ display: { xs: 'none', sm: 'flex' }, width: { sm: 124, md: 156 }, flexShrink: 0 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}
        >
          {t('learning:player.percentComplete', { percent })}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-hidden
          sx={{ height: 5, borderRadius: 5 }}
        />
      </Stack>
      <IconButton
        aria-label={t('learning:player.outline')}
        aria-haspopup="dialog"
        onClick={onOpenOutline}
        sx={(theme) => ({
          display: { md: 'none' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          transition: theme.transitions.create(['border-color', 'background-color'], {
            duration: theme.transitions.duration.short,
          }),
          '&:hover': { borderColor: 'primary.main', bgcolor: 'surfaceMuted' },
        })}
      >
        <ListAltOutlined />
      </IconButton>
      <ButtonLink
        variant="outlined"
        to="/courses/$courseId"
        params={{ courseId: course.id }}
        aria-label={t('learning:player.backToCourse')}
        sx={(theme) => ({
          flexShrink: 0,
          whiteSpace: 'nowrap',
          minWidth: 44,
          height: 42,
          px: { xs: 1, sm: 1.5 },
          borderColor: 'divider',
          borderRadius: 1.5,
          color: 'text.primary',
          transition: theme.transitions.create(['border-color', 'background-color'], {
            duration: theme.transitions.duration.short,
          }),
          '&:hover': { borderColor: 'primary.main', bgcolor: 'surfaceMuted' },
        })}
      >
        <ArrowBackOutlined
          aria-hidden
          fontSize="small"
          sx={{ mr: { xs: 0, sm: 1 }, display: 'block' }}
        />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {t('learning:player.backToCourse')}
        </Box>
      </ButtonLink>
    </Stack>
  );
}
