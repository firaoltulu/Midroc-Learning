import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { useDeleteItem, useUpdateItem } from '../api/authoring';
import type { AuthoringItem, ItemPatch } from '../api/schemas';
import { useSaveErrorText } from '../lib/save-error';
import { INSTRUCTIONS_MAX, TITLE_MAX, titleProblem, tooLong } from '../model/limits';
import { megabytes } from '../model/pdf-file';
import { useSaveTracker } from '../model/save-tracker';
import { AutosaveTextField } from './autosave-text-field';
import { MoveButtons } from './move-buttons';
import { PdfDropzone } from './pdf-dropzone';
import { QuestionBuilder } from './question-builder';

/** The selected item: title, its type's fields, move and delete. */
export function ItemPanel({
  courseId,
  item,
  position,
  count,
  onMove,
  onDeleted,
  readOnly,
}: {
  courseId: string;
  item: AuthoringItem;
  position: number;
  count: number;
  onMove: (to: number) => void;
  onDeleted: () => void;
  readOnly: boolean;
}) {
  const { t } = useTranslation(['editor', 'courses']);
  const update = useUpdateItem(courseId);
  const remove = useDeleteItem(courseId);
  const tracker = useSaveTracker();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [confirming, setConfirming] = useState(false);
  const save = (patch: ItemPatch) => update.mutateAsync({ itemId: item.id, patch });

  return (
    <Stack spacing={3} component="section" aria-labelledby={`item-${item.id}-heading`}>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {t(`courses:itemType.${item.type}`)}
        </Typography>
        <Typography
          id={`item-${item.id}-heading`}
          variant="h3"
          component="h2"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {item.title}
        </Typography>
      </Stack>

      <AutosaveTextField
        slot={`item:${item.id}.title`}
        label={t('item.title')}
        savedValue={item.title}
        save={(value) => save({ title: value.trim() })}
        validate={titleProblem}
        maxLength={TITLE_MAX}
        readOnly={readOnly}
        required
      />

      {item.type === 'video' ? (
        <VideoSection item={item} save={save} readOnly={readOnly} />
      ) : item.type === 'pdf' ? (
        <PdfSection item={item} save={save} readOnly={readOnly} />
      ) : (
        <>
          <ExamSettings item={item} save={save} readOnly={readOnly} />
          <Divider />
          <QuestionBuilder courseId={courseId} item={item} readOnly={readOnly} />
        </>
      )}

      {readOnly ? null : (
        <>
          <Divider />
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}
          >
            <MoveButtons
              position={position}
              count={count}
              onMove={onMove}
              upLabel={t('item.moveUp')}
              downLabel={t('item.moveDown')}
            />
            <Button
              color="error"
              onClick={() => {
                setConfirming(true);
              }}
            >
              {t('item.delete')}
            </Button>
          </Stack>
          <ConfirmDialog
            open={confirming}
            tone="danger"
            title={t('item.deleteTitle', { title: item.title })}
            description={t('item.deleteBody')}
            confirmLabel={t('item.delete')}
            onClose={() => {
              setConfirming(false);
            }}
            onConfirm={async () => {
              try {
                await tracker.run('structure', () => remove.mutateAsync(item.id), {
                  reportFailure: false,
                });
                setConfirming(false);
                onDeleted();
              } catch (error) {
                setConfirming(false);
                toast.show({ message: errorMessage(error), severity: 'error' });
              }
            }}
          />
        </>
      )}
    </Stack>
  );
}

function VideoSection({
  item,
  save,
  readOnly,
}: {
  item: AuthoringItem;
  save: (patch: ItemPatch) => Promise<unknown>;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  const saveErrorText = useSaveErrorText();
  const tracker = useSaveTracker();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const replace = async () => {
    if (!url.trim()) {
      setError('empty');
      return;
    }
    setBusy(true);
    setDone(false);
    try {
      await tracker.run(`item:${item.id}.video`, () => save({ url: url.trim() }));
      setUrl('');
      setError(null);
      setDone(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('video.current')}
        </Typography>
        <Typography sx={{ overflowWrap: 'anywhere', fontWeight: 500 }}>
          {item.youtubeTitle ?? t('video.untitled')}
        </Typography>
      </Box>
      {item.isAvailable === false ? (
        <Alert severity="warning" variant="outlined">
          {t('video.unavailable')}
        </Alert>
      ) : null}
      {done ? (
        <Alert severity="success" variant="outlined">
          {t('video.replaced')}
        </Alert>
      ) : null}
      {readOnly ? null : (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'flex-start' } }}
        >
          <FormTextField
            label={t('video.newLink')}
            hint={t('video.linkHint')}
            value={url}
            type="url"
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            errorKey={
              error === 'empty'
                ? 'validation:VIDEO_LINK_REQUIRED.default'
                : (saveErrorText(error) ?? undefined)
            }
          />
          <Button
            variant="outlined"
            onClick={() => void replace()}
            loading={busy}
            sx={{ flexShrink: 0, mt: { sm: 1 } }}
          >
            {t('video.replace')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function PdfSection({
  item,
  save,
  readOnly,
}: {
  item: AuthoringItem;
  save: (patch: ItemPatch) => Promise<unknown>;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  const tracker = useSaveTracker();
  const saveErrorText = useSaveErrorText();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('pdf.current')}
        </Typography>
        <Typography sx={{ fontWeight: 500 }}>
          {item.pageCount !== null && item.sizeBytes !== null
            ? t('pdf.summary', {
                count: item.pageCount,
                size: megabytes(item.sizeBytes),
              })
            : t('pdf.attached')}
        </Typography>
      </Box>
      {done ? (
        <Alert severity="success" variant="outlined">
          {t('pdf.replaced')}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" variant="outlined">
          {saveErrorText(error)}
        </Alert>
      ) : null}
      {readOnly ? null : (
        <PdfDropzone
          label={t('pdf.replace')}
          onUploaded={async (upload) => {
            setDone(false);
            try {
              await tracker.run(`item:${item.id}.pdf`, () => save({ fileKey: upload.fileKey }));
              setError(null);
              setDone(true);
            } catch (caught) {
              setError(caught);
            }
          }}
        />
      )}
    </Stack>
  );
}

const isWhole = (value: string) => /^\d+$/.test(value.trim());

/** 0–100. */
const percentProblem = (value: string) =>
  isWhole(value) && Number(value.trim()) <= 100 ? null : 'editor:exam.errors.percent';

/** Empty (no limit) or a whole number of 1 or more. */
const optionalPositiveProblem = (value: string) =>
  value.trim() === '' || (isWhole(value) && Number(value.trim()) >= 1)
    ? null
    : 'editor:exam.errors.positive';

const toOptional = (value: string) => (value.trim() === '' ? null : Number(value.trim()));
const fromOptional = (value: number | null) => (value === null ? '' : String(value));

function ExamSettings({
  item,
  save,
  readOnly,
}: {
  item: AuthoringItem;
  save: (patch: ItemPatch) => Promise<unknown>;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  return (
    <Stack spacing={3} component="section" aria-labelledby={`settings-${item.id}`}>
      <Typography id={`settings-${item.id}`} variant="h4" component="h3">
        {t('exam.settings')}
      </Typography>
      <AutosaveTextField
        slot={`item:${item.id}.instructions`}
        label={t('exam.instructions')}
        savedValue={item.instructions ?? ''}
        save={(value) => save({ instructions: value })}
        validate={tooLong(INSTRUCTIONS_MAX)}
        maxLength={INSTRUCTIONS_MAX}
        readOnly={readOnly}
        multiline
        minRows={3}
      />
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          alignItems: 'start',
        }}
      >
        <AutosaveTextField
          slot={`item:${item.id}.passingScore`}
          label={t('exam.passingScore')}
          hint={t('exam.passingScoreHint')}
          savedValue={String(item.passingScorePercent ?? 60)}
          save={(value) => save({ passingScorePercent: Number(value.trim()) })}
          validate={percentProblem}
          readOnly={readOnly}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <AutosaveTextField
          slot={`item:${item.id}.maxAttempts`}
          label={t('exam.maxAttempts')}
          hint={t('exam.maxAttemptsHint')}
          savedValue={fromOptional(item.maxAttempts)}
          save={(value) => save({ maxAttempts: toOptional(value) })}
          validate={optionalPositiveProblem}
          readOnly={readOnly}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <AutosaveTextField
          slot={`item:${item.id}.timeLimit`}
          label={t('exam.timeLimit')}
          hint={t('exam.timeLimitHint')}
          savedValue={fromOptional(item.timeLimitMinutes)}
          save={(value) => save({ timeLimitMinutes: toOptional(value) })}
          validate={optionalPositiveProblem}
          readOnly={readOnly}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Box>
    </Stack>
  );
}
