import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ParseKeys } from 'i18next';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type FormTextFieldProps = Omit<TextFieldProps, 'error' | 'helperText'> & {
  /**
   * The field's error message: a translation key from a zod schema (e.g.
   * 'auth:form.emailRequired'), or text already translated by useApplyApiIssues.
   */
  errorKey?: string | undefined;
  /** Shown when there is no error. */
  hint?: string;
  /** `above`: the label sits on its own line above the box (sign-in pages). Default `floating`. */
  labelPlacement?: 'floating' | 'above';
};

/**
 * TextField with a translated error (linked through aria-describedby by MUI) and, for
 * passwords, a show/hide toggle.
 */
export const FormTextField = forwardRef<HTMLInputElement, FormTextFieldProps>(
  function FormTextField(
    { errorKey, hint, type, slotProps, labelPlacement = 'floating', ...props },
    ref,
  ) {
    const { t, i18n } = useTranslation('common');
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';
    const above = labelPlacement === 'above';

    return (
      <TextField
        {...props}
        inputRef={ref}
        type={isPassword && visible ? 'text' : type}
        error={Boolean(errorKey)}
        helperText={errorKey ? (i18n.exists(errorKey) ? t(errorKey as ParseKeys) : errorKey) : hint}
        fullWidth
        slotProps={{
          ...slotProps,
          ...(above
            ? {
                inputLabel: {
                  shrink: true,
                  sx: {
                    position: 'static',
                    transform: 'none',
                    mb: 0.75,
                    color: 'text.primary',
                    fontWeight: 500,
                    '&.Mui-focused': { color: 'text.primary' },
                    '&.Mui-error': { color: 'error.main' },
                  },
                },
                // Hints and errors line up with the label, not the text inside the box.
                formHelperText: { sx: { mx: 0 } },
              }
            : {}),
          input: isPassword
            ? {
                ...(above ? { notched: false } : {}),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      aria-label={visible ? t('password.hide') : t('password.show')}
                      aria-pressed={visible}
                      onClick={() => {
                        setVisible((value) => !value);
                      }}
                    >
                      {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            : above
              ? { notched: false }
              : undefined,
        }}
      />
    );
  },
);
