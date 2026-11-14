import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { useEffect, useRef, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export interface SearchFieldProps {
  label: string;
  /** The value in the URL. */
  value: string | undefined;
  /** Called after typing pauses (undefined when cleared). */
  onChange: (value: string | undefined) => void;
  sx?: TextFieldProps['sx'];
}

/**
 * A search box whose value lives in the URL: typing is debounced, and a change from outside
 * (back/forward, "Clear filters") updates the box.
 */
export function SearchField({ label, value, onChange, sx }: SearchFieldProps) {
  const [text, setText] = useState(value ?? '');
  const lastSent = useRef(value ?? '');
  const latestChange = useRef(onChange);
  useEffect(() => {
    latestChange.current = onChange;
  });

  useEffect(() => {
    const fromUrl = value ?? '';
    if (fromUrl !== lastSent.current) {
      lastSent.current = fromUrl;
      setText(fromUrl);
    }
  }, [value]);

  useEffect(() => {
    const next = text.trim();
    if (next === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = next;
      latestChange.current(next || undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  return (
    <TextField
      type="search"
      size="small"
      label={label}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      sx={sx}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlined />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
