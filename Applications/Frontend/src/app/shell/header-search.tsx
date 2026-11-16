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
        borderRadius: 0,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: theme.transitions.create(['border-color', 'box-shadow', 'background-color']),
        '&:hover': {
          borderColor: 'text.secondary',
          bgcolor: 'surfaceMuted',
        },
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: `0 0 0 3px rgba(var(--mui-palette-primary-mainChannel) / 0.14), inset 0 0 0 1px ${(theme.vars ?? theme).palette.primary.main}`,
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
        sx={{
          flex: 1,
          minWidth: 0,
          px: 1.75,
          '& input': { py: 1.15, fontSize: '0.875rem' },
        }}
      />
      <Button
        type="submit"
        variant="contained"
        aria-label={t('shell.searchSubmit')}
        sx={(theme) => ({
          borderRadius: 0,
          border: 1,
          borderColor: 'primary.dark',
          minWidth: 40,
          minHeight: 40,
          px: 1.25,
          m: 0.375,
          transition: theme.transitions.create(['transform', 'box-shadow']),
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(19, 83, 57, 0.24)',
          },
          '&:active': { transform: 'scale(0.96)' },
        })}
      >
        <SearchOutlined fontSize="small" />
      </Button>
    </Box>
  );
}
