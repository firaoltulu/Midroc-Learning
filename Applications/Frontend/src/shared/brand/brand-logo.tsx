import { Box } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import logoDark from '../../../reference/logo-dark.png';
import logoLight from '../../../reference/logo-light.png';
import markDark from '../../../reference/mark-dark.png';
import markLight from '../../../reference/mark-light.png';
import { useTranslation } from 'react-i18next';

export interface BrandLogoProps {
  variant?: 'full' | 'mark';
}

export function BrandLogo({ variant = 'full' }: BrandLogoProps) {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation('common');
  const isDark = colorScheme === 'dark';
  const image =
    variant === 'mark' ? (isDark ? markDark : markLight) : isDark ? logoDark : logoLight;

  return (
    <Box
      component="img"
      src={image}
      alt={t('brand')}
      sx={{
        display: 'block',
        width: variant === 'mark' ? 42 : { xs: 128, sm: 168 },
        height: variant === 'mark' ? 42 : 44,
        objectFit: 'contain'
      }}
    />
  );
}
