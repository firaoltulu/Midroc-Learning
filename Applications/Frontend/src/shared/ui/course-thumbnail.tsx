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
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ opacity: 0.55 }} data-fallback="">
          <BrandLogo variant="mark" height={40} decorative />
        </Box>
      )}
    </Box>
  );
}
