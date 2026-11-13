import CheckOutlined from '@mui/icons-material/CheckOutlined';
import TranslateOutlined from '@mui/icons-material/TranslateOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type Language } from '../i18n/languages';
import { setLanguage } from '../i18n/setup';
import { useLanguage } from '../i18n/use-language';

/**
 * Header control for the interface language. Each language is named in its own language
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
        aria-label={label}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        startIcon={<TranslateOutlined />}
        sx={{
          color: 'text.secondary',
          minWidth: 44,
          minHeight: 44,
          '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
        }}
      >
        {/* Phones show only the icon; the accessible name still includes the language. */}
        <Box component="span" lang={current} sx={{ display: { xs: 'none', sm: 'inline' } }}>
          {t(`languages.${current}`)}
        </Box>
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <MenuItem
            key={language}
            role="menuitemradio"
            aria-checked={current === language}
            selected={current === language}
            onClick={() => {
              choose(language);
            }}
          >
            <ListItemText lang={language}>{t(`languages.${language}`)}</ListItemText>
            {current === language ? (
              <CheckOutlined fontSize="small" sx={{ ml: 2 }} aria-hidden />
            ) : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
