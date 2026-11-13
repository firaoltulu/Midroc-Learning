import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { useReplaceQuestions } from '../api/authoring';
import type { AuthoringItem } from '../api/schemas';
import { useAutosave } from '../hooks/use-autosave';
import { useKeyText } from '../lib/key-text';
import { useSaveErrorText } from '../lib/save-error';
import {
  assignIds,
  fromAuthoring,
  markCorrect,
  MAX_CHOICES,
  MIN_CHOICES,
  move,
  newChoice,
  newQuestion,
  setMultiple,
  toInput,
  validateQuestions,
  type QuestionDraft,
} from '../model/questions';

/** What the server stores, ignoring ids and client keys: equal signatures need no save. */
const signature = (drafts: QuestionDraft[]) =>
  JSON.stringify(
    drafts.map((draft) => [
      draft.prompt,
      draft.isMultiple,
      draft.points,
      draft.choices.map((choice) => [choice.text, choice.isCorrect]),
    ]),
  );

/**
 * The exam's questions: add, remove and reorder questions; 2–10 answers each, single answer
 * (radio) or multiple answers (checkboxes) with "mark correct"; points. Saved as a whole
 * (debounced) once every question is valid; the rules mirror the backend.
 */
export function QuestionBuilder({
  courseId,
  item,
  readOnly,
}: {
  courseId: string;
  item: AuthoringItem;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  const keyText = useKeyText();
  const saveErrorText = useSaveErrorText();
  const replace = useReplaceQuestions(courseId);
  const initial = useMemo(() => fromAuthoring(item.questions ?? []), [item.questions]);
  const [drafts, setDrafts] = useState(initial);
  // Questions the author has left at least once: only these show their problems.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  // Ids the server assigned to new entries, by client key: read synchronously when sending,
  // so a save that follows another one never sends a saved question again as new.
  const knownIds = useRef(new Map<string, string>());

  const problems = useMemo(() => validateQuestions(drafts), [drafts]);
  const { serverError } = useAutosave({
    slot: `item:${item.id}.questions`,
    value: drafts,
    savedValue: initial,
    isEqual: (a, b) => signature(a) === signature(b),
    validate: (value) =>
      value.length === 0
        ? 'editor:questions.errors.noQuestions'
        : validateQuestions(value).size > 0
          ? 'editor:questions.errors.incomplete'
          : null,
    save: async (value) => {
      const withIds = value.map((question) => ({
        ...question,
        id: question.id ?? knownIds.current.get(question.key),
        choices: question.choices.map((choice) => ({
          ...choice,
          id: choice.id ?? knownIds.current.get(choice.key),
        })),
      }));
      const saved = await replace.mutateAsync({ itemId: item.id, questions: toInput(withIds) });
      const updated = assignIds(withIds, withIds, saved);
      for (const question of updated) {
        if (question.id) knownIds.current.set(question.key, question.id);
        for (const choice of question.choices) {
          if (choice.id) knownIds.current.set(choice.key, choice.id);
        }
      }
      setDrafts((current) => assignIds(current, withIds, saved));
    },
    disabled: readOnly,
  });

  const update = (key: string, change: (question: QuestionDraft) => QuestionDraft) => {
    setDrafts((current) =>
      current.map((question) => (question.key === key ? change(question) : question)),
    );
  };

  const addQuestion = () => {
    setDrafts((current) => [...current, newQuestion()]);
  };

  return (
    <Stack spacing={2} component="section" aria-labelledby={`questions-${item.id}`}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography id={`questions-${item.id}`} variant="h4" component="h3">
          {t('questions.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('questions.count', { count: drafts.length })}
        </Typography>
      </Stack>

      {drafts.length === 0 ? (
        <Alert severity="info" variant="outlined">
          {t('questions.empty')}
        </Alert>
      ) : null}
      {serverError ? (
        <Alert severity="error" variant="outlined">
          {saveErrorText(serverError)}
        </Alert>
      ) : null}

      <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {drafts.map((question, index) => {
          const shown = touched.has(question.key) ? problems.get(question.key) : undefined;
          const number = index + 1;
          const choicesProblemId = `${question.key}-choices-problem`;
          const Control = question.isMultiple ? Checkbox : Radio;
          return (
            <Card
              key={question.key}
              component="li"
              variant="outlined"
              onBlur={(event) => {
                // Left the whole card (not just moved between its fields).
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setTouched((current) => new Set(current).add(question.key));
                }
              }}
              sx={{ p: 2 }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="h5" component="h4">
                    {t('questions.number', { number })}
                  </Typography>
                  {readOnly ? null : (
                    <Stack direction="row">
                      <IconButton
                        aria-label={t('questions.moveUp', { number })}
                        onClick={() => {
                          setDrafts((current) => move(current, index, index - 1));
                        }}
                        disabled={index === 0}
                        sx={{ width: 44, height: 44 }}
                      >
                        <ArrowUpwardOutlined />
                      </IconButton>
                      <IconButton
                        aria-label={t('questions.moveDown', { number })}
                        onClick={() => {
                          setDrafts((current) => move(current, index, index + 1));
                        }}
                        disabled={index === drafts.length - 1}
                        sx={{ width: 44, height: 44 }}
                      >
                        <ArrowDownwardOutlined />
                      </IconButton>
                      <IconButton
                        aria-label={t('questions.remove', { number })}
                        onClick={() => {
                          setDrafts((current) => current.filter(({ key }) => key !== question.key));
                        }}
                        sx={{ width: 44, height: 44 }}
                      >
                        <DeleteOutlineOutlined />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>

                <FormTextField
                  label={t('questions.prompt')}
                  value={question.prompt}
                  disabled={readOnly}
                  multiline
                  minRows={2}
                  onChange={(event) => {
                    update(question.key, (draft) => ({ ...draft, prompt: event.target.value }));
                  }}
                  errorKey={shown?.prompt}
                />

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                    alignItems: 'start',
                  }}
                >
                  <TextField
                    select
                    fullWidth
                    label={t('questions.answerType')}
                    value={question.isMultiple ? 'multiple' : 'single'}
                    disabled={readOnly}
                    onChange={(event) => {
                      update(question.key, (draft) =>
                        setMultiple(draft, event.target.value === 'multiple'),
                      );
                    }}
                  >
                    <MenuItem value="single">{t('questions.single')}</MenuItem>
                    <MenuItem value="multiple">{t('questions.multiple')}</MenuItem>
                  </TextField>
                  <FormTextField
                    label={t('questions.points')}
                    value={question.points}
                    disabled={readOnly}
                    onChange={(event) => {
                      update(question.key, (draft) => ({ ...draft, points: event.target.value }));
                    }}
                    errorKey={shown?.points}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  />
                </Box>

                <Box
                  component="fieldset"
                  aria-describedby={shown?.choices ? choicesProblemId : undefined}
                  sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
                >
                  <Typography component="legend" variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    {question.isMultiple ? t('questions.answersMultiple') : t('questions.answers')}
                  </Typography>
                  <Stack spacing={1.5}>
                    {question.choices.map((choice, choiceIndex) => {
                      const choiceNumber = choiceIndex + 1;
                      return (
                        <Stack
                          key={choice.key}
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'flex-start' }}
                        >
                          <Control
                            checked={choice.isCorrect}
                            disabled={readOnly}
                            onChange={() => {
                              update(question.key, (draft) => markCorrect(draft, choice.key));
                            }}
                            slotProps={{
                              input: {
                                'aria-label': t('questions.markCorrect', {
                                  number: choiceNumber,
                                }),
                              },
                            }}
                            sx={{ mt: 1 }}
                          />
                          <FormTextField
                            label={t('questions.answer', { number: choiceNumber })}
                            value={choice.text}
                            disabled={readOnly}
                            onChange={(event) => {
                              update(question.key, (draft) => ({
                                ...draft,
                                choices: draft.choices.map((entry) =>
                                  entry.key === choice.key
                                    ? { ...entry, text: event.target.value }
                                    : entry,
                                ),
                              }));
                            }}
                            errorKey={shown?.choiceText[choice.key]}
                          />
                          {!readOnly && question.choices.length > MIN_CHOICES ? (
                            <IconButton
                              aria-label={t('questions.removeAnswer', { number: choiceNumber })}
                              onClick={() => {
                                update(question.key, (draft) => ({
                                  ...draft,
                                  choices: draft.choices.filter(({ key }) => key !== choice.key),
                                }));
                              }}
                              sx={{ width: 44, height: 44, mt: 0.5 }}
                            >
                              <CloseOutlined />
                            </IconButton>
                          ) : null}
                        </Stack>
                      );
                    })}
                  </Stack>
                  {shown?.choices ? (
                    <Typography id={choicesProblemId} variant="body2" color="error" sx={{ mt: 1 }}>
                      {keyText(shown.choices)}
                    </Typography>
                  ) : null}
                  {readOnly ? null : question.choices.length < MAX_CHOICES ? (
                    <Button
                      startIcon={<AddOutlined />}
                      onClick={() => {
                        update(question.key, (draft) => ({
                          ...draft,
                          choices: [...draft.choices, newChoice()],
                        }));
                      }}
                      sx={{ mt: 1 }}
                    >
                      {t('questions.addAnswer')}
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('questions.maxAnswers', { max: MAX_CHOICES })}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {readOnly ? null : (
        <Button
          variant="outlined"
          startIcon={<AddOutlined />}
          onClick={addQuestion}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('questions.add')}
        </Button>
      )}
    </Stack>
  );
}
