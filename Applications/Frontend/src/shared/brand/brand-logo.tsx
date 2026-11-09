import { Box } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import logoDark from '../../../reference/logo-dark.png';
import logoLight from '../../../reference/logo-light.png';
import markDark from '../../../reference/mark-dark.png';
import markLight from '../../../reference/mark-light.png';
import { useLanguage } from '../i18n/language-provider';

export interface BrandLogoProps {
  variant?: 'full' | 'mark';
}

export function BrandLogo({ variant = 'full' }: BrandLogoProps) {
  const { colorScheme } = useColorScheme();
  const { messages } = useLanguage();
  const isDark = colorScheme === 'dark';
  const image =
    variant === 'mark' ? (isDark ? markDark : markLight) : isDark ? logoDark : logoLight;

  return (
    <Box
      component="img"
      src={image}
      alt={messages.brand}
      sx={{
        display: 'block',
        width: variant === 'mark' ? 42 : { xs: 128, sm: 168 },
        height: variant === 'mark' ? 42 : 44,
        objectFit: 'contain'
      }}
    />
  );
}
