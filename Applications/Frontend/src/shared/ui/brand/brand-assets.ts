/**
 * The only place that knows which files make up the brand. To replace the PNGs (for example
 * with SVGs later), swap the files and these imports; BrandLogo's API stays the same.
 */
import logoDark from './logo-dark.png';
import logoLight from './logo-light.png';
import markDark from './mark-dark.png';
import markLight from './mark-light.png';

export interface BrandAsset {
  src: string;
  /** Intrinsic size, used for the aspect ratio so the image never shifts the layout. */
  width: number;
  height: number;
}

export type BrandVariant = 'full' | 'mark';

export const brandAssets: Record<BrandVariant, Record<'light' | 'dark', BrandAsset>> = {
  full: {
    light: { src: logoLight, width: 376, height: 94 },
    dark: { src: logoDark, width: 376, height: 94 },
  },
  mark: {
    light: { src: markLight, width: 178, height: 94 },
    dark: { src: markDark, width: 178, height: 94 },
  },
};
