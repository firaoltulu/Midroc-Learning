import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../../shared/ui/form-text-field';
import { useUpdateItem } from '../../api/authoring';
import { useEffectHint } from '../../lib/effect-hint';
import { useSaveErrorText } from '../../lib/save-error';
import { fieldEffect } from '../../model/field-effects';
import { INSTRUCTIONS_MAX, TITLE_MAX, titleProblem, tooLong } from '../../model/limits';
import { megabytes } from '../../model/pdf-file';
import type { WorkingItem } from '../../model/working-copy';
import { useWorkingCopy } from '../../model/working-copy-store';
import { AutosaveTextField } from '../autosave-text-field';
import { MoveButtons } from '../move-buttons';
import { PdfDropzone } from '../pdf-dropzone';
import { QuestionList } from '../question-builder';

const isWhole = (value: string) => /^\d+$/.test(value.trim());
const percentProblem = (value: string) =>
  isWhole(value) && Number(value.trim()) <= 100 ? null : 'editor:exam.errors.percent';
const optionalPositiveProblem = (value: string) =>
  value.trim() === '' || (isWhole(value) && Number(value.trim()) >= 1)
    ? null
    : 'editor:exam.errors.positive';

/**
 * An item of the working copy. A live item's title applies right away; everything else
 * (video link, file, exam settings and questions, its module and position) goes with the
 * changes for review.
 */
export function WorkingItemPanel({
  courseId,
  item,
  moduleKey,
  readOnly,
}: {
  courseId: string;
  item: WorkingItem;
  moduleKey: string;
  readOnly: boolean;
}) {
  const { t } = useTranslation(['editor', 'courses']);
  const effectHint = useEffectHint();
  const saveErrorText = useSaveErrorText();
  const update = useUpdateItem(courseId);
  const modules = useWorkingCopy((state) => state.copy.modules);
  const updateItem = useWorkingCopy((state) => state.updateItem);
  const updateExam = useWorkingCopy((state) => state.updateExam);
  const setQuestions = useWorkingCopy((state) => state.setQuestions);
  const moveItem = useWorkingCopy((state) => state.moveItem);
  const removeItem = useWorkingCopy((state) => state.removeItem);
  const select = useWorkingCopy((state) => state.select);
  const submitAttempted = useWorkingCopy((state) => state.submitAttempted);
  const serverError = useWorkingCopy((state) => state.itemErrors[item.key]);

  const module = modules.find((entry) => entry.key === moduleKey);
  const position = module?.items.findIndex((entry) => entry.key === item.key) ?? 0;
  const isNew = !item.id;
  const review = fieldEffect('item', 'video', isNew);
  const errorText = serverError ? saveErrorText(serverError) : null;

  return (
    <Stack spacing={3} component="section" aria-labelledby={`item-${item.key}-heading`}>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {isNew
            ? t('working.newItemLabel', { type: t(`courses:itemType.${item.type}`) })
            : t(`courses:itemType.${item.type}`)}
        </Typography>
        <Typography
          id={`item-${item.key}-heading`}
          variant="h3"
          component="h2"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {item.title || t('working.untitled')}
        </Typography>
      </Stack>

      {item.id ? (
        <AutosaveTextField
          slot={`item:${item.id}.title`}
          label={t('item.title')}
          hint={effectHint(fieldEffect('item', 'title'))}
          savedValue={item.title}
          save={async (value) => {
            await update.mutateAsync({ itemId: item.id ?? '', patch: { title: value.trim() } });
            updateItem(item.key, { title: value.trim() });
          }}
          validate={titleProblem}
          maxLength={TITLE_MAX}
          readOnly={readOnly}
          required
        />
      ) : (
        <FormTextField
          label={t('item.title')}
          hint={effectHint(review)}
          value={item.title}
          disabled={readOnly}
          required
          onChange={(event) => {
            updateItem(item.key, { title: event.target.value });
          }}
          errorKey={titleProblem(item.title) ?? undefined}
        />
      )}

      {item.type === 'video' ? (
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('video.current')}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere', fontWeight: 500 }}>
              {item.video?.url
                ? t('working.videoPending')
                : (item.video?.youtubeTitle ?? t('video.untitled'))}
            </Typography>
          </Box>
          {readOnly ? null : (
            <FormTextField
              label={item.video?.youtubeVideoId ? t('video.newLink') : t('addItem.videoLink')}
              hint={effectHint(review, t('working.linkCheckedOnSubmit'))}
              value={item.video?.url ?? ''}
              type="url"
              onChange={(event) => {
                updateItem(item.key, {
                  video: {
                    youtubeVideoId: item.video?.youtubeVideoId ?? null,
                    youtubeTitle: item.video?.youtubeTitle ?? null,
                    url: event.target.value || null,
                  },
                });
              }}
              errorKey={errorText ?? undefined}
            />
          )}
        </Stack>
      ) : null}

      {item.type === 'pdf' ? (
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('pdf.current')}
            </Typography>
            <Typography sx={{ fontWeight: 500 }}>
              {item.pdf?.pageCount != null && item.pdf.sizeBytes != null
                ? t('pdf.summary', {
                    count: item.pdf.pageCount,
                    size: megabytes(item.pdf.sizeBytes),
                  })
                : t('pdf.attached')}
            </Typography>
          </Box>
          {errorText ? (
            <Alert severity="error" variant="outlined">
              {errorText}
            </Alert>
          ) : null}
          {readOnly ? null : (
            <>
              <Typography variant="body2" color="text.secondary">
                {effectHint(review)}
              </Typography>
              <PdfDropzone
                label={t('pdf.replace')}
                onUploaded={(upload) => {
                  updateItem(item.key, {
                    pdf: {
                      fileKey: upload.fileKey,
                      sizeBytes: upload.sizeBytes,
                      pageCount: upload.pageCount,
                    },
                  });
                }}
              />
            </>
          )}
        </Stack>
      ) : null}

      {item.type === 'exam' && item.exam ? (
        <>
          <Stack spacing={3} component="section" aria-labelledby={`settings-${item.key}`}>
            <Typography id={`settings-${item.key}`} variant="h4" component="h3">
              {t('exam.settings')}
            </Typography>
            <FormTextField
              label={t('exam.instructions')}
              hint={effectHint(review)}
              value={item.exam.instructions}
              disabled={readOnly}
              multiline
              minRows={3}
              onChange={(event) => {
                updateExam(item.key, { instructions: event.target.value });
              }}
              errorKey={tooLong(INSTRUCTIONS_MAX)(item.exam.instructions) ?? undefined}
            />
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                alignItems: 'start',
              }}
            >
              <FormTextField
                label={t('exam.passingScore')}
                hint={t('exam.passingScoreHint')}
                value={item.exam.passingScorePercent}
                disabled={readOnly}
                onChange={(event) => {
                  updateExam(item.key, { passingScorePercent: event.target.value });
                }}
                errorKey={percentProblem(item.exam.passingScorePercent) ?? undefined}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <FormTextField
                label={t('exam.maxAttempts')}
                hint={t('exam.maxAttemptsHint')}
                value={item.exam.maxAttempts}
                disabled={readOnly}
                onChange={(event) => {
                  updateExam(item.key, { maxAttempts: event.target.value });
                }}
                errorKey={optionalPositiveProblem(item.exam.maxAttempts) ?? undefined}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <FormTextField
                label={t('exam.timeLimit')}
                hint={t('exam.timeLimitHint')}
                value={item.exam.timeLimitMinutes}
                disabled={readOnly}
                onChange={(event) => {
                  updateExam(item.key, { timeLimitMinutes: event.target.value });
                }}
                errorKey={optionalPositiveProblem(item.exam.timeLimitMinutes) ?? undefined}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Box>
          </Stack>
          <Divider />
          <QuestionList
            id={item.key}
            drafts={item.exam.questions}
            onChange={(updateQuestions) => {
              setQuestions(item.key, updateQuestions);
            }}
            readOnly={readOnly}
            showAllProblems={submitAttempted}
            notice={
              <Typography variant="body2" color="text.secondary">
                {effectHint(review)}
              </Typography>
            }
          />
        </>
      ) : null}

      {readOnly ? null : (
        <>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            {t('working.structureHint')}
          </Typography>
          <TextField
            select
            label={t('working.module')}
            value={moduleKey}
            onChange={(event) => {
              const target = modules.find((entry) => entry.key === event.target.value);
              if (target) moveItem(item.key, target.key, target.items.length);
            }}
            sx={{ maxWidth: 360 }}
          >
            {modules.map((entry) => (
              <MenuItem key={entry.key} value={entry.key}>
                {entry.title || t('working.untitled')}
              </MenuItem>
            ))}
          </TextField>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}
          >
            <MoveButtons
              position={position}
              count={module?.items.length ?? 1}
              onMove={(to) => {
                moveItem(item.key, moduleKey, to);
              }}
              upLabel={t('item.moveUp')}
              downLabel={t('item.moveDown')}
            />
            <Button
              color="error"
              onClick={() => {
                removeItem(item.key);
                select(module ? { kind: 'module', key: module.key } : null);
              }}
            >
              {t('working.removeItem')}
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
