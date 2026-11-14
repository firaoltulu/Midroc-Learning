import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import StarOutlined from '@mui/icons-material/StarOutlined';
import Rating from '@mui/material/Rating';

/**
 * Stars for a rating (to one decimal). Decorative: the number is always written next to them,
 * so screen readers hear it once. `onHero` uses the gold that reads on the green band.
 */
export function RatingStars({
  value,
  onHero = false,
  size = 'small',
  max = 5,
}: {
  value: number;
  onHero?: boolean;
  size?: 'small' | 'medium';
  /** 1: a single filled star (course cards). */
  max?: number;
}) {
  return (
    <Rating
      value={value}
      precision={0.1}
      max={max}
      readOnly
      size={size}
      aria-hidden
      icon={<StarOutlined fontSize="inherit" />}
      emptyIcon={<StarBorderOutlined fontSize="inherit" />}
      sx={{
        color: onHero ? 'rating.onHero' : 'rating.main',
        '& .MuiRating-iconEmpty': { color: onHero ? 'hero.fgMuted' : 'text.secondary' },
      }}
    />
  );
}
