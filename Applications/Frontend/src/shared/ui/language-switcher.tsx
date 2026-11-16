import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type Language } from '../i18n/languages';
import { setLanguage } from '../i18n/setup';
import { useLanguage } from '../i18n/use-language';

/**
 * Header control for the interface language, shown as "EN · አማ". Each language is named in its own language
 * (and marked with its `lang`) so people can find theirs whatever is currently shown.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation('common');
  const current = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const label = t('language.menuLabel', { language: t(`languages.${current}`) });

  const choose = (language: Language) => {
    setAnchor(null);
    if (language !== current) void setLanguage(language);
  };

  return (
    <>
      <Button
        color="inherit"
        variant="outlined"
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={(theme) => ({
          color: 'text.primary',
          minWidth: 44,
          minHeight: 44,
          fontWeight: 500,
          px: 1.25,
          borderRadius: 0,
          borderColor: 'divider',
          transition: theme.transitions.create([
            'transform',
            'background-color',
            'border-color',
            'color',
          ]),
          '&:hover': {
            bgcolor: 'surfaceMuted',
            color: 'primary.main',
            borderColor: 'primary.main',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'scale(0.97)' },
        })}
      >
        {/* The name is "Language: English"; the short "EN · አማ" (current in bold) is only drawn,
            so screen readers don't read two language codes. */}
        <Box component="span" sx={visuallyHidden}>
          {label}
        </Box>
        {SUPPORTED_LANGUAGES.map((language, index) => (
          <Box component="span" key={language} aria-hidden sx={{ whiteSpace: 'pre' }}>
            {index > 0 ? ' · ' : null}
            <Box
              component="span"
              lang={language}
              sx={{ fontWeight: language === current ? 700 : 400 }}
            >
              {t(`languagesShort.${language}`)}
            </Box>
          </Box>
        ))}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={() => {
          setAnchor(null);
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 224,
              mt: 1,
              p: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: '6px',
              bgcolor: 'background.paper',
              boxShadow: '0 12px 28px rgba(13, 36, 25, 0.14)',
              '& .MuiMenu-list': { p: 0 },
            },
          },
        }}
      >
        <Box
          component="li"
          role="presentation"
          sx={{ px: 1.5, pt: 1, pb: 1, borderBottom: 1, borderColor: 'divider', mb: 0.5 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('language.menuTitle')}
          </Typography>
        </Box>
        {SUPPORTED_LANGUAGES.map((language) => (
          <MenuItem
            key={language}
            role="menuitemradio"
            aria-checked={current === language}
            selected={current === language}
            onClick={() => {
              choose(language);
            }}
            sx={{
              mx: 0.25,
              my: 0.25,
              minHeight: 44,
              border: 1,
              borderColor: 'transparent',
              borderRadius: 0,
              transition: (theme) =>
                theme.transitions.create(['background-color', 'border-color', 'color']),
              '&:hover': { bgcolor: 'surfaceMuted' },
              '&.Mui-selected': {
                bgcolor: 'surfaceMuted',
                color: 'primary.main',
                fontWeight: 600,
                borderColor: 'primary.main',
              },
              '&.Mui-selected:hover': { bgcolor: 'surfaceMuted', borderColor: 'primary.main' },
            }}
          >
            <Box
              component="span"
              lang={language}
              aria-hidden
              sx={{
                minWidth: 38,
                px: 0.75,
                py: 0.35,
                mr: 1.5,
                border: 1,
                borderColor: current === language ? 'primary.main' : 'divider',
                borderRadius: 0,
                bgcolor: current === language ? 'primary.main' : 'background.default',
                color: current === language ? 'primary.contrastText' : 'text.secondary',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {t(`languagesShort.${language}`)}
            </Box>
            <ListItemText lang={language}>{t(`languages.${language}`)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
