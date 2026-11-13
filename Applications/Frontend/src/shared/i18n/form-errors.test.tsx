import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, type ApiIssue } from '../api/errors';
import { FormTextField } from '../ui/form-text-field';
import { useApplyApiIssues, type ApplyIssuesResult } from './form-errors';

interface Values {
  title: string;
  description: string;
}

function CourseForm({
  error,
  onResult,
}: {
  error: unknown;
  onResult: (r: ApplyIssuesResult) => void;
}) {
  const { register, setError, formState } = useForm<Values>();
  const applyIssues = useApplyApiIssues<Values>();
  const [applied, setApplied] = useState(false);

  return (
    <form>
      <FormTextField
        {...register('title')}
        label="Title"
        errorKey={formState.errors.title?.message}
      />
      <FormTextField
        {...register('description')}
        label="Description"
        errorKey={formState.errors.description?.message}
      />
      <button
        type="button"
        disabled={applied}
        onClick={() => {
          setApplied(true);
          onResult(
            applyIssues(error, setError, {
              fields: ['title', 'description'],
              fieldMap: { summary: 'description' },
            }),
          );
        }}
      >
        Save
      </button>
    </form>
  );
}

const issue = (path: ApiIssue['path'], code: string, extra: object = {}) => ({
  path,
  code,
  message: 'English text from the server',
  ...extra,
});

describe('useApplyApiIssues', () => {
  it('puts translated messages on the matching fields and focuses the first', async () => {
    const error = new ApiError(400, {
      error: 'Validation failed',
      issues: [
        issue(['title'], 'too_small', { origin: 'string', minimum: 3 }),
        issue(['summary'], 'too_big', { origin: 'string', maximum: 500 }),
        issue(['tags', 0], 'too_big', { origin: 'string', maximum: 30 }),
      ],
    });
    const onResult = vi.fn();
    render(<CourseForm error={error} onResult={onResult} />);

    screen.getByRole('button', { name: 'Save' }).click();

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription(
        'Enter at least 3 characters.',
      );
    });
    // Mapped from the server path `summary`.
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAccessibleDescription(
      'Use no more than 500 characters.',
    );
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    expect(screen.queryByText('English text from the server')).not.toBeInTheDocument();

    // No field for tags.0: returned for a form-level message.
    expect(onResult).toHaveBeenCalledWith({
      applied: true,
      unmatched: [
        { path: ['tags', 0], code: 'too_big', params: { origin: 'string', maximum: 30 } },
      ],
    });
  });

  it('does nothing for errors without issues', () => {
    const onResult = vi.fn();
    render(<CourseForm error={new Error('offline')} onResult={onResult} />);
    screen.getByRole('button', { name: 'Save' }).click();
    expect(onResult).toHaveBeenCalledWith({ applied: false, unmatched: [] });
  });
});
