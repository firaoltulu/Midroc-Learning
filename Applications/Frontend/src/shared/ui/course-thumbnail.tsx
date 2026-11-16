import Box from '@mui/material/Box';
import { useState } from 'react';
import { isHttpUrl } from '../lib/safe-url';
import { BrandLogo } from './brand/brand-logo';

export interface CourseThumbnailProps {
  /** The course's thumbnail URL; anything but http(s) shows the fallback. */
  src: string | null | undefined;
}

/**
 * A course image at a fixed 16:9 ratio (no layout shift), lazy-loaded. Decorative: the course
 * title is always next to it. Missing, non-http(s) or broken images show the brand mark on a
 * muted surface.
 */
export function CourseThumbnail({ src }: CourseThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = isHttpUrl(src) && failedSrc !== src;

  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        bgcolor: 'surfaceMuted',
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(var(--mui-palette-primary-mainChannel) / 0.08), transparent 55%), linear-gradient(135deg, var(--mui-palette-background-paper), var(--mui-palette-background-default))',
        display: 'grid',
        placeItems: 'center',
      }}
      data-testid="course-thumbnail"
    >
      {usable ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailedSrc(src);
          }}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 450ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          }}
        />
      ) : (
        <Box sx={{ opacity: 0.72 }} data-fallback="">
          <BrandLogo variant="mark" height={40} decorative />
        </Box>
      )}
    </Box>
  );
}
