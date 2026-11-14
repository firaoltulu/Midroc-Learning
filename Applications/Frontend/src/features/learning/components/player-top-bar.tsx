import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
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
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: PLAYER_BAR_HEIGHT,
        alignItems: 'center',
        px: { xs: 1, sm: 3 },
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <RouterLink
        to="/"
        aria-label={t('common:brand.homeLink')}
        sx={{ display: 'inline-flex', borderRadius: 1, flexShrink: 0, p: 0.5 }}
      >
        <BrandLogo variant="mark" height={28} decorative />
      </RouterLink>
      <Typography
        component="p"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '1rem', sm: '1.125rem' },
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        {...contentLang}
      >
        {course.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
      >
        {t('learning:player.percentComplete', { percent })}
      </Typography>
      <IconButton
        aria-label={t('learning:player.outline')}
        aria-haspopup="dialog"
        onClick={onOpenOutline}
        sx={{ display: { md: 'none' } }}
      >
        <ListAltOutlined />
      </IconButton>
      {/* Phones: an arrow (same accessible name), so the course title keeps its room. */}
      <ButtonLink
        variant="outlined"
        to="/courses/$courseId"
        params={{ courseId: course.id }}
        aria-label={t('learning:player.backToCourse')}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap', minWidth: 44, px: { xs: 1, sm: 2 } }}
      >
        <ArrowBackOutlined aria-hidden fontSize="small" sx={{ display: { sm: 'none' } }} />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {t('learning:player.backToCourse')}
        </Box>
      </ButtonLink>
    </Stack>
  );
}
