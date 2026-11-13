import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { isHttpUrl } from '../../../shared/lib/safe-url';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { useDeleteCourse, useUpdateCourse } from '../api/authoring';
import type { AuthoringView, CoursePatch } from '../api/schemas';
import { useAutosave } from '../hooks/use-autosave';
import { useKeyText } from '../lib/key-text';
import { useSaveErrorText } from '../lib/save-error';
import { COURSE_LIMITS, tooLong } from '../model/limits';
import { useEffectHint } from '../lib/effect-hint';
import { fieldEffect, type FieldEffect } from '../model/field-effects';
import { useWorkingCopy } from '../model/working-copy-store';
import { AutosaveTextField } from './autosave-text-field';

const requiredWithin = (max: number) => (value: string) =>
  !value.trim()
    ? 'editor:details.errors.titleRequired'
    : value.length > max
      ? 'editor:field.tooLong'
      : null;

const durationProblem = (value: string) =>
  value.trim() === '' || /^\d+$/.test(value.trim()) ? null : 'editor:details.errors.duration';

const thumbnailProblem = (value: string) =>
  value.trim() === '' || isHttpUrl(value.trim()) ? null : 'validation:HTTP_URL_REQUIRED.default';

/**
 * Details: title, description (plain text, counter), category, language, tags, duration and
 * thumbnail URL. Draft and rejected courses: each field saves itself (text debounced, choices
 * at once). Published courses (`published`): the major fields (title, description, category,
 * language) edit the working copy and go to review; the others still apply right away. Each
 * field says which.
 */
export function DetailsTab({
  view,
  readOnly,
  published = false,
}: {
  view: AuthoringView;
  readOnly: boolean;
  published?: boolean;
}) {
  const { t } = useTranslation('editor');
  const effectHint = useEffectHint();
  const course = view.course;
  const update = useUpdateCourse(course.id);
  const save = (patch: CoursePatch) => update.mutateAsync(patch);
  const [thumbnail, setThumbnail] = useState(course.thumbnailUrl ?? '');
  const minor = (hint?: string) =>
    published ? effectHint(fieldEffect('course', 'tags'), hint) : hint;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      {published ? (
        <WorkingMajorFields readOnly={readOnly} />
      ) : (
        <DraftMajorFields view={view} readOnly={readOnly} save={save} />
      )}
      <AutosaveTextField
        slot="course.duration"
        label={t('details.duration')}
        hint={minor(t('details.durationHint'))}
        savedValue={
          course.estimatedDurationMinutes === null ? '' : String(course.estimatedDurationMinutes)
        }
        save={(value) =>
          save({ estimatedDurationMinutes: value.trim() === '' ? null : Number(value.trim()) })
        }
        validate={durationProblem}
        readOnly={readOnly}
        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        sx={{ maxWidth: { sm: 'calc(50% - 12px)' } }}
      />
      <TagsField
        savedValue={course.tags}
        save={(tags) => save({ tags })}
        readOnly={readOnly}
        effect={published ? fieldEffect('course', 'tags') : undefined}
      />
      <Stack spacing={1.5}>
        <ThumbnailField
          savedValue={course.thumbnailUrl ?? ''}
          onValueChange={setThumbnail}
          save={(value) => save({ thumbnailUrl: value.trim() || null })}
          readOnly={readOnly}
          hint={minor(t('details.thumbnailHint'))}
        />
        <Box sx={{ width: 240, maxWidth: '100%', borderRadius: '10px', overflow: 'hidden' }}>
          <CourseThumbnail src={thumbnail.trim() || null} />
        </Box>
      </Stack>
      {course.status === 'draft' ? (
        <DeleteCourse courseId={course.id} title={course.title} />
      ) : null}
    </Stack>
  );
}

/** Draft and rejected courses: the major fields save themselves. */
function DraftMajorFields({
  view,
  readOnly,
  save,
}: {
  view: AuthoringView;
  readOnly: boolean;
  save: (patch: CoursePatch) => Promise<unknown>;
}) {
  const { t } = useTranslation('editor');
  const course = view.course;
  return (
    <>
      <AutosaveTextField
        slot="course.title"
        label={t('details.title')}
        savedValue={course.title}
        save={(value) => save({ title: value.trim() })}
        validate={requiredWithin(COURSE_LIMITS.title)}
        maxLength={COURSE_LIMITS.title}
        readOnly={readOnly}
        required
      />
      <AutosaveTextField
        slot="course.description"
        label={t('details.description')}
        hint={t('details.descriptionHint')}
        savedValue={course.description}
        save={(value) => save({ description: value })}
        validate={tooLong(COURSE_LIMITS.description)}
        maxLength={COURSE_LIMITS.description}
        readOnly={readOnly}
        multiline
        minRows={6}
      />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <AutosaveTextField
          slot="course.category"
          label={t('details.category')}
          hint={t('details.categoryHint')}
          savedValue={course.category ?? ''}
          save={(value) => save({ category: value.trim() || null })}
          validate={tooLong(COURSE_LIMITS.category)}
          readOnly={readOnly}
        />
        <LanguageField
          savedValue={course.language}
          save={(language) => save({ language })}
          readOnly={readOnly}
        />
      </Box>
    </>
  );
}

/** Published courses: the major fields edit the working copy (sent for review). */
function WorkingMajorFields({ readOnly }: { readOnly: boolean }) {
  const { t } = useTranslation(['editor', 'common']);
  const effectHint = useEffectHint();
  const course = useWorkingCopy((state) => state.copy.course);
  const setCourse = useWorkingCopy((state) => state.setCourse);
  const review = fieldEffect('course', 'title');
  const counter = (value: string, max: number) => t('field.counter', { count: value.length, max });

  return (
    <>
      <FormTextField
        label={t('details.title')}
        value={course.title}
        disabled={readOnly}
        required
        onChange={(event) => {
          setCourse({ title: event.target.value });
        }}
        errorKey={requiredWithin(COURSE_LIMITS.title)(course.title) ?? undefined}
        hint={effectHint(review, counter(course.title, COURSE_LIMITS.title))}
      />
      <FormTextField
        label={t('details.description')}
        value={course.description}
        disabled={readOnly}
        multiline
        minRows={6}
        onChange={(event) => {
          setCourse({ description: event.target.value });
        }}
        errorKey={tooLong(COURSE_LIMITS.description)(course.description) ?? undefined}
        hint={effectHint(
          review,
          `${t('details.descriptionHint')} · ${counter(course.description, COURSE_LIMITS.description)}`,
        )}
      />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <FormTextField
          label={t('details.category')}
          value={course.category ?? ''}
          disabled={readOnly}
          onChange={(event) => {
            setCourse({ category: event.target.value || null });
          }}
          errorKey={tooLong(COURSE_LIMITS.category)(course.category ?? '') ?? undefined}
          hint={effectHint(review, t('details.categoryHint'))}
        />
        <TextField
          select
          fullWidth
          label={t('details.language')}
          value={course.language}
          disabled={readOnly}
          onChange={(event) => {
            setCourse({ language: event.target.value === 'am' ? 'am' : 'en' });
          }}
          helperText={effectHint(review, t('details.languageHint'))}
        >
          <MenuItem value="en">{t('common:languages.en')}</MenuItem>
          <MenuItem value="am" lang="am">
            {t('common:languages.am')}
          </MenuItem>
        </TextField>
      </Box>
    </>
  );
}

/** Drafts only: delete the course for good (confirmed), then back to My courses. */
function DeleteCourse({ courseId, title }: { courseId: string; title: string }) {
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const navigate = useNavigate();
  const remove = useDeleteCourse(courseId);
  const [confirming, setConfirming] = useState(false);

  return (
    <Stack
      spacing={1}
      sx={{ pt: 2, borderTop: 1, borderColor: 'divider', alignItems: 'flex-start' }}
    >
      <Typography variant="h4" component="h2">
        {t('deleteCourse.heading')}
      </Typography>
      <Typography color="text.secondary">{t('deleteCourse.hint')}</Typography>
      <Button
        color="error"
        variant="outlined"
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t('deleteCourse.action')}
      </Button>
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={t('deleteCourse.title', { title })}
        description={t('deleteCourse.body')}
        confirmLabel={t('deleteCourse.action')}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={async () => {
          try {
            await remove.mutateAsync();
            setConfirming(false);
            toast.show({ message: t('deleteCourse.done', { title }), severity: 'success' });
            await navigate({ to: '/my-courses' });
          } catch (error) {
            setConfirming(false);
            toast.show({ message: errorMessage(error), severity: 'error' });
          }
        }}
      />
    </Stack>
  );
}

function ThumbnailField({
  savedValue,
  save,
  onValueChange,
  readOnly,
  hint,
}: {
  savedValue: string;
  save: (value: string) => Promise<unknown>;
  onValueChange: (value: string) => void;
  readOnly: boolean;
  hint: string | undefined;
}) {
  const { t } = useTranslation('editor');
  const saveErrorText = useSaveErrorText();
  const [value, setValue] = useState(savedValue);
  const { problem, serverError, flush } = useAutosave({
    slot: 'course.thumbnail',
    value,
    savedValue,
    save,
    validate: thumbnailProblem,
    disabled: readOnly,
  });
  return (
    <FormTextField
      label={t('details.thumbnail')}
      hint={hint}
      value={value}
      disabled={readOnly}
      type="url"
      onChange={(event) => {
        setValue(event.target.value);
        onValueChange(event.target.value);
      }}
      onBlur={flush}
      errorKey={problem ?? saveErrorText(serverError) ?? undefined}
    />
  );
}

function LanguageField({
  savedValue,
  save,
  readOnly,
}: {
  savedValue: 'en' | 'am';
  save: (value: 'en' | 'am') => Promise<unknown>;
  readOnly: boolean;
}) {
  const { t } = useTranslation(['editor', 'common']);
  const saveErrorText = useSaveErrorText();
  const [value, setValue] = useState(savedValue);
  const { serverError } = useAutosave({
    slot: 'course.language',
    value,
    savedValue,
    save,
    delay: 0,
    disabled: readOnly,
  });
  const error = saveErrorText(serverError);
  return (
    <TextField
      select
      fullWidth
      label={t('details.language')}
      value={value}
      disabled={readOnly}
      onChange={(event) => {
        setValue(event.target.value === 'am' ? 'am' : 'en');
      }}
      error={Boolean(error)}
      helperText={error ?? t('details.languageHint')}
    >
      <MenuItem value="en">{t('common:languages.en')}</MenuItem>
      <MenuItem value="am" lang="am">
        {t('common:languages.am')}
      </MenuItem>
    </TextField>
  );
}

const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && a.every((tag, index) => tag === b[index]);

function TagsField({
  savedValue,
  save,
  readOnly,
  effect,
}: {
  savedValue: string[];
  save: (value: string[]) => Promise<unknown>;
  readOnly: boolean;
  effect: FieldEffect | undefined;
}) {
  const { t } = useTranslation('editor');
  const effectHint = useEffectHint();
  const saveErrorText = useSaveErrorText();
  const keyText = useKeyText();
  const [tags, setTags] = useState(savedValue);
  const [input, setInput] = useState('');
  const [inputProblem, setInputProblem] = useState<string | null>(null);
  const { problem, serverError } = useAutosave({
    slot: 'course.tags',
    value: tags,
    savedValue,
    save,
    isEqual: sameTags,
    validate: (value) =>
      value.length > COURSE_LIMITS.tags ? 'editor:details.errors.tooManyTags' : null,
    delay: 0,
    disabled: readOnly,
  });

  const error = keyText(inputProblem ?? problem) ?? saveErrorText(serverError);

  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={tags}
      inputValue={input}
      disabled={readOnly}
      onInputChange={(_event, next) => {
        setInput(next);
        setInputProblem(null);
      }}
      onChange={(_event, next) => {
        const cleaned = next.map((tag) => tag.trim()).filter(Boolean);
        if (cleaned.some((tag) => tag.length > COURSE_LIMITS.tag)) {
          setInputProblem('editor:details.errors.tagTooLong');
          return;
        }
        setTags([...new Set(cleaned)]);
      }}
      renderValue={(value, getItemProps) =>
        value.map((tag, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} label={tag} size="small" {...itemProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('details.tags')}
          error={Boolean(error)}
          helperText={
            error ?? effectHint(effect, t('details.tagsHint', { max: COURSE_LIMITS.tags }))
          }
        />
      )}
    />
  );
}
