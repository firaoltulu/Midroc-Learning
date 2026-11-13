import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormTextField, type FormTextFieldProps } from '../../../shared/ui/form-text-field';
import { useAutosave } from '../hooks/use-autosave';
import { useSaveErrorText } from '../lib/save-error';

export type AutosaveTextFieldProps = Omit<
  FormTextFieldProps,
  'value' | 'onChange' | 'onBlur' | 'errorKey' | 'defaultValue' | 'ref'
> & {
  slot: string;
  /** The server's value when the field mounted. */
  savedValue: string;
  save: (value: string) => Promise<unknown>;
  /** A translation key for what's wrong, or null. */
  validate?: (value: string) => string | null;
  /** Shows "12 / 200" under the field. */
  maxLength?: number;
  readOnly?: boolean;
};

/** A text field that saves itself (debounced, and on blur) and shows why a save failed. */
export function AutosaveTextField({
  slot,
  savedValue,
  save,
  validate,
  maxLength,
  readOnly = false,
  hint,
  ...props
}: AutosaveTextFieldProps) {
  const { t } = useTranslation('editor');
  const saveErrorText = useSaveErrorText();
  const [value, setValue] = useState(savedValue);
  const { problem, serverError, flush } = useAutosave({
    slot,
    value,
    savedValue,
    save,
    validate,
    disabled: readOnly,
  });

  const counter =
    maxLength !== undefined
      ? t('field.counter', { count: value.length, max: maxLength })
      : undefined;

  return (
    <FormTextField
      {...props}
      value={value}
      disabled={readOnly}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onBlur={flush}
      errorKey={problem ?? saveErrorText(serverError) ?? undefined}
      hint={[hint, counter].filter(Boolean).join(' · ') || undefined}
    />
  );
}
