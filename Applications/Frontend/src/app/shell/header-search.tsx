import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import { visuallyHidden } from '@mui/utils';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** The catalog's current text query, when the catalog is the open page. */
function useCatalogQuery() {
  return useRouterState({
    select: (state) => {
      if (state.location.pathname !== '/courses') return '';
      const q: unknown = (state.location.search as Record<string, unknown>).q;
      return typeof q === 'string' ? q : '';
    },
  });
}

/**
 * The header's "What do you want to learn?" box: submitting opens the catalog with the text
 * as its search (a new search, so other filters are cleared). On the catalog it shows the
 * current query. It fills the width of its container.
 */
export function HeaderSearch({ onSubmitted }: { onSubmitted?: () => void }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const current = useCatalogQuery();
  const [text, setText] = useState(current);
  // When the catalog's query changes (another search, back/forward), show it.
  const [shown, setShown] = useState(current);
  if (shown !== current) {
    setShown(current);
    setText(current);
  }
  const inputId = useId();

  return (
    <Box
      component="form"
      role="search"
      aria-label={t('shell.searchLabel')}
      onSubmit={(event) => {
        event.preventDefault();
        const q = text.trim();
        void navigate({ to: '/courses', search: q ? { q } : {} });
        onSubmitted?.();
      }}
      sx={(theme) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        minWidth: 0,
        border: 1,
        borderColor: 'inputBorder',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: `inset 0 0 0 1px ${(theme.vars ?? theme).palette.primary.main}`,
        },
      })}
    >
      <Box component="label" htmlFor={inputId} sx={visuallyHidden}>
        {t('shell.searchLabel')}
      </Box>
      <InputBase
        id={inputId}
        type="search"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        placeholder={t('shell.searchPlaceholder')}
        inputProps={{ maxLength: 200 }}
        sx={{ flex: 1, minWidth: 0, px: 1.5, '& input': { py: 1 } }}
      />
      <Button
        type="submit"
        variant="contained"
        aria-label={t('shell.searchSubmit')}
        sx={{ borderRadius: 0, minWidth: 44, minHeight: 40, px: 1.5 }}
      >
        <SearchOutlined fontSize="small" />
      </Button>
    </Box>
  );
}
