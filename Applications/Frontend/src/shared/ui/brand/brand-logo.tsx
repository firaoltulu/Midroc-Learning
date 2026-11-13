import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import {
  useResolvedColorScheme,
  type ResolvedColorScheme,
} from '../../theme/use-resolved-color-scheme';
import { brandAssets, type BrandVariant } from './brand-assets';

export interface BrandLogoProps {
  /** `full`: mark and wordmark. `mark`: the symbol only (mobile header, favicon). */
  variant?: BrandVariant;
  /** Rendered height in px; the width follows the aspect ratio. */
  height?: number;
  /**
   * Decorative logos (next to visible text, or inside a labelled link) should pass `true`
   * so screen readers don't hear the name twice.
   */
  decorative?: boolean;
  /** Force a scheme instead of following the resolved one (only for previews). */
  colorScheme?: ResolvedColorScheme;
}

export function BrandLogo({
  variant = 'full',
  height = 32,
  decorative = false,
  colorScheme,
}: BrandLogoProps) {
  const { t } = useTranslation('common');
  const resolved = useResolvedColorScheme();
  const asset = brandAssets[variant][colorScheme ?? resolved];

  return (
    <Box
      component="img"
      src={asset.src}
      alt={decorative ? '' : t('brand.logoAlt')}
      width={Math.round((asset.width / asset.height) * height)}
      height={height}
      data-variant={variant}
      data-scheme={colorScheme ?? resolved}
      sx={{ display: 'block', aspectRatio: `${asset.width} / ${asset.height}`, height }}
    />
  );
}
