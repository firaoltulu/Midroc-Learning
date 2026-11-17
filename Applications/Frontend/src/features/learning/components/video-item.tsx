import VideocamOffOutlined from '@mui/icons-material/VideocamOffOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useLanguage } from '../../../shared/i18n/use-language';
import { ErrorState } from '../../../shared/ui/error-state';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { useSaveProgress, videoQueryOptions, type VideoPlayback } from '../api/playback';
import {
  isUnavailableError,
  loadYouTubeApi,
  YOUTUBE_HOST,
  type YouTubePlayer,
} from '../lib/youtube-api';
import { createVideoProgress, SAVE_INTERVAL_MS, startPosition } from '../model/video-progress';

const POLL_MS = 1_000;

interface VideoItemProps {
  courseId: string;
  itemId: string;
  title: string;
}

/** A video item: the YouTube player with resume and progress saving. Loaded lazily. */
export default function VideoItem({ courseId, itemId, title }: VideoItemProps) {
  const errorMessage = useErrorMessage();
  const video = useQuery(videoQueryOptions(itemId));

  if (video.isPending) {
    return (
      <LoadingRegion>
        <Skeleton variant="rounded" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
      </LoadingRegion>
    );
  }
  if (video.isError) {
    return (
      <ErrorState description={errorMessage(video.error)} onRetry={() => void video.refetch()} />
    );
  }
  if (!video.data.isAvailable) return <VideoUnavailable />;
  return <YouTubeFrame courseId={courseId} itemId={itemId} title={title} video={video.data} />;
}

function VideoUnavailable() {
  const { t } = useTranslation('learning');
  return (
    <Stack
      role="status"
      spacing={2}
      sx={{
        aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
        minHeight: 220,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: { xs: 2.5, sm: 4 },
        border: 1,
        borderColor: 'divider',
        bgcolor: 'surfaceMuted',
        borderRadius: '18px',
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(var(--mui-palette-primary-mainChannel) / 0.1), transparent 58%)',
      }}
    >
      <Avatar
        aria-hidden
        sx={{
          width: 56,
          height: 56,
          bgcolor: 'background.paper',
          color: 'text.secondary',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <VideocamOffOutlined />
      </Avatar>
      <Stack spacing={0.75} sx={{ alignItems: 'center', maxWidth: 480 }}>
        <Typography variant="h4" component="h2">
          {t('video.unavailable.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('video.unavailable.body')}
        </Typography>
      </Stack>
    </Stack>
  );
}

function YouTubeFrame({
  courseId,
  itemId,
  title,
  video,
}: VideoItemProps & { video: VideoPlayback }) {
  const { t } = useTranslation('learning');
  const language = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const save = useSaveProgress(courseId, itemId);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'failed'>('loading');
  // Read inside the effect without restarting the player when they change.
  const latest = useRef({ save, frameTitle: t('video.frameTitle', { title }) });
  useEffect(() => {
    latest.current = { save, frameTitle: t('video.frameTitle', { title }) };
  });

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;
    const progress = createVideoProgress({
      initialPositionSeconds: video.lastPositionSeconds,
      alreadyCompleted: video.completed,
      save: (payload, options) => {
        latest.current.save(payload, options);
      },
    });

    const sample = () => {
      if (!player) return;
      try {
        progress.update(player.getCurrentTime(), player.getDuration());
      } catch {
        // The iframe isn't ready (or is already gone): nothing to sample.
      }
    };
    const stopTimers = () => {
      clearInterval(poll);
      clearInterval(tick);
    };
    const saveOnHide = () => {
      sample();
      progress.flush({ keepalive: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveOnHide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', saveOnHide);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const mount = document.createElement('div');
        container.append(mount);
        player = new YT.Player(mount, {
          host: YOUTUBE_HOST,
          videoId: video.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            playsinline: 1,
            hl: language,
            origin: window.location.origin,
            start: video.lastPositionSeconds,
          },
          events: {
            onReady: ({ target }) => {
              target.getIframe().title = latest.current.frameTitle;
              // A finished video starts over instead of at its last second.
              const start = startPosition(video.lastPositionSeconds, target.getDuration());
              if (start !== video.lastPositionSeconds) {
                target.cueVideoById({ videoId: video.youtubeVideoId, startSeconds: start });
              }
              setState('ready');
            },
            onStateChange: ({ data }) => {
              if (data === YT.PlayerState.PLAYING) {
                stopTimers();
                poll = setInterval(sample, POLL_MS);
                tick = setInterval(() => {
                  progress.tick();
                }, SAVE_INTERVAL_MS);
                return;
              }
              stopTimers();
              sample();
              if (data === YT.PlayerState.ENDED && player) progress.ended(player.getDuration());
              else if (data === YT.PlayerState.PAUSED) progress.flush();
            },
            onError: ({ data }) => {
              setState(isUnavailableError(data) ? 'unavailable' : 'failed');
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
      stopTimers();
      sample();
      progress.flush({ keepalive: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', saveOnHide);
      player?.destroy();
      container.replaceChildren();
    };
    // Recreate the player only for another video; language applies to the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.youtubeVideoId]);

  if (state === 'unavailable') return <VideoUnavailable />;
  if (state === 'failed') {
    return <ErrorState title={t('video.failed.title')} description={t('video.failed.body')} />;
  }
  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '16 / 9',
        border: 1,
        borderColor: 'divider',
        borderRadius: '18px',
        overflow: 'hidden',
        bgcolor: 'common.black',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.16)',
        '& iframe': {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
        },
      }}
    >
      {state === 'loading' ? (
        <LoadingRegion label={t('video.loading')}>
          <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: '100%' }} />
        </LoadingRegion>
      ) : null}
      <Box ref={host} sx={{ position: 'absolute', inset: 0 }} />
    </Box>
  );
}
