import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categoriesQueryOptions } from '../api/catalog';
import { hasFilters, type CatalogSearch } from '../schemas/search';

export const SEARCH_DEBOUNCE_MS = 300;

export interface CatalogFiltersProps {
  search: CatalogSearch;
  /** `replace` while typing, so each keystroke doesn't add a history entry. */
  onChange: (next: CatalogSearch, options?: { replace?: boolean }) => void;
}

const ALL = '';

/** Search (debounced), category and language. Any change goes back to page 1. */
export function CatalogFilters({ search, onChange }: CatalogFiltersProps) {
  const { t } = useTranslation(['catalog', 'common']);
  const categories = useQuery(categoriesQueryOptions());
  const [text, setText] = useState(search.q ?? '');
  const lastSent = useRef(search.q ?? '');
  // Latest props for the debounce timer, so re-renders don't restart it.
  const latest = useRef({ search, onChange });
  useEffect(() => {
    latest.current = { search, onChange };
  });

  // Follow the URL when it changes from outside (back/forward, "Clear filters").
  useEffect(() => {
    const fromUrl = search.q ?? '';
    if (fromUrl !== lastSent.current) {
      lastSent.current = fromUrl;
      setText(fromUrl);
    }
  }, [search.q]);

  // Debounce typing into the URL.
  useEffect(() => {
    const value = text.trim();
    if (value === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = value;
      const { search: current, onChange: change } = latest.current;
      change({ ...current, q: value || undefined, page: undefined }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  const categoryOptions = [...(categories.data ?? [])];
  // Keep a category from the URL selectable even if it's no longer in the list.
  if (search.category && !categoryOptions.includes(search.category)) {
    categoryOptions.push(search.category);
  }

  return (
    <Stack
      role="search"
      aria-label={t('catalog:filters.label')}
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ alignItems: { md: 'center' } }}
    >
      <TextField
        type="search"
        label={t('catalog:filters.search')}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        sx={{ flex: { md: 2 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined />
              </InputAdornment>
            ),
          },
          htmlInput: { maxLength: 200 },
        }}
      />
      {categoryOptions.length > 0 ? (
        <TextField
          select
          label={t('catalog:filters.category')}
          value={search.category ?? ALL}
          onChange={(event) => {
            onChange({ ...search, category: event.target.value || undefined, page: undefined });
          }}
          sx={{ flex: { md: 1 }, minWidth: { md: 180 } }}
        >
          <MenuItem value={ALL}>{t('catalog:filters.allCategories')}</MenuItem>
          {categoryOptions.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      <TextField
        select
        label={t('catalog:filters.language')}
        value={search.language ?? ALL}
        onChange={(event) => {
          const value = event.target.value;
          onChange({
            ...search,
            language: value === 'en' || value === 'am' ? value : undefined,
            page: undefined,
          });
        }}
        sx={{ flex: { md: 1 }, minWidth: { md: 160 } }}
      >
        <MenuItem value={ALL}>{t('catalog:filters.allLanguages')}</MenuItem>
        <MenuItem value="en">{t('common:languages.en')}</MenuItem>
        <MenuItem value="am" lang="am">
          {t('common:languages.am')}
        </MenuItem>
      </TextField>
      {hasFilters(search) ? (
        <Button
          variant="text"
          onClick={() => {
            onChange({});
          }}
          sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', md: 'center' } }}
        >
          {t('catalog:filters.clear')}
        </Button>
      ) : null}
    </Stack>
  );
}
