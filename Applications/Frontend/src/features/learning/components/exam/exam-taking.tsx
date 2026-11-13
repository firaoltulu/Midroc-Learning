import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import type { ExamSession } from '../../api/exams';
import { choose, isAnswered, type Answers } from '../../model/exam-answers';
import { ExamTimer } from './exam-timer';

export interface ExamTakingProps {
  session: ExamSession;
  answers: Answers;
  onAnswersChange: (answers: Answers) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  contentLang: { lang?: string };
}

/** One question at a time, a numbered navigator, a review step and the timer. */
export function ExamTaking({
  session,
  answers,
  onAnswersChange,
  onSubmit,
  submitting,
  submitError,
  contentLang,
}: ExamTakingProps) {
  const { t } = useTranslation('exam');
  const questions = session.questions;
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new question (or the review) so keyboard and screen-reader users follow.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index, reviewing]);

  const unanswered = questions.filter((question) => !isAnswered(answers, question.id)).length;
  const question = questions[index];

  const submit = () => {
    if (unanswered > 0) setConfirming(true);
    else onSubmit();
  };
  const goTo = (target: number) => {
    setReviewing(false);
    setIndex(target);
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography color="text.secondary">
          {t('taking.answeredCount', {
            answered: questions.length - unanswered,
            total: questions.length,
          })}
        </Typography>
        {session.expiresAt ? (
          <ExamTimer
            expiresAt={session.expiresAt}
            clockOffset={session.clockOffset}
            onExpire={onSubmit}
          />
        ) : null}
      </Stack>

      <Navigator
        count={questions.length}
        current={reviewing ? -1 : index}
        isAnswered={(position) => {
          const entry = questions[position];
          return entry ? isAnswered(answers, entry.id) : false;
        }}
        onSelect={goTo}
      />

      {reviewing || !question ? (
        <Stack spacing={2}>
          <Typography
            ref={headingRef}
            tabIndex={-1}
            variant="h3"
            component="h2"
            sx={{ outline: 'none' }}
          >
            {t('review.title')}
          </Typography>
          <Typography color="text.secondary">
            {unanswered > 0
              ? t('review.unanswered', { count: unanswered })
              : t('review.allAnswered')}
          </Typography>
          <List disablePadding>
            {questions.map((entry, position) => {
              const answered = isAnswered(answers, entry.id);
              return (
                <ListItem
                  key={entry.id}
                  divider
                  secondaryAction={
                    <Button
                      size="small"
                      onClick={() => {
                        goTo(position);
                      }}
                      aria-label={t('review.changeLabel', { number: position + 1 })}
                    >
                      {answered ? t('review.change') : t('review.answer')}
                    </Button>
                  }
                  sx={{ pr: 12 }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'flex-start', minWidth: 0 }}
                  >
                    {answered ? (
                      <CheckCircleOutlined
                        aria-hidden
                        fontSize="small"
                        sx={{ color: 'success.main', mt: 0.25 }}
                      />
                    ) : (
                      <RadioButtonUncheckedOutlined
                        aria-hidden
                        fontSize="small"
                        sx={{ color: 'text.secondary', mt: 0.25 }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('review.questionStatus', {
                          number: position + 1,
                          status: answered ? t('review.answered') : t('review.notAnswered'),
                        })}
                      </Typography>
                      <Typography
                        sx={{
                          overflowWrap: 'anywhere',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        {...contentLang}
                      >
                        {entry.prompt}
                      </Typography>
                    </Box>
                  </Stack>
                </ListItem>
              );
            })}
          </List>
          {submitError ? (
            <Alert severity="error" variant="outlined">
              {submitError}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackOutlined />}
              onClick={() => {
                goTo(questions.length - 1);
              }}
            >
              {t('taking.previous')}
            </Button>
            <Button variant="contained" size="large" disabled={submitting} onClick={submit}>
              {submitting ? t('review.submitting') : t('review.submit')}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
            <Typography
              ref={headingRef}
              tabIndex={-1}
              variant="h3"
              component="h2"
              sx={{ outline: 'none', mb: 1 }}
            >
              {t('taking.questionOf', { number: index + 1, total: questions.length })}
            </Typography>
            <Typography
              component="legend"
              sx={{
                fontSize: '1.125rem',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                maxWidth: 720,
                p: 0,
                mb: 1,
              }}
              {...contentLang}
            >
              {question.prompt}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('taking.hint', {
                hint: question.isMultiple ? t('taking.selectAll') : t('taking.selectOne'),
                points: t('taking.points', { count: question.points }),
              })}
            </Typography>
            <Stack
              spacing={1}
              role={question.isMultiple ? 'group' : 'radiogroup'}
              aria-label={t('taking.choices')}
            >
              {question.choices.map((choice) => {
                const selected = (answers[question.id] ?? []).includes(choice.id);
                const Control = question.isMultiple ? Checkbox : Radio;
                return (
                  <FormControlLabel
                    key={choice.id}
                    control={
                      <Control
                        checked={selected}
                        onChange={() => {
                          onAnswersChange(
                            choose(answers, question.id, choice.id, question.isMultiple),
                          );
                        }}
                        name={`question-${question.id}`}
                      />
                    }
                    label={
                      <Typography
                        sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                        {...contentLang}
                      >
                        {choice.text}
                      </Typography>
                    }
                    sx={{
                      m: 0,
                      minHeight: 48,
                      px: 1,
                      py: 0.5,
                      border: 1,
                      borderRadius: '10px',
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? 'action.selected' : 'transparent',
                      alignItems: 'center',
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
            {index > 0 ? (
              <Button
                variant="outlined"
                startIcon={<ArrowBackOutlined />}
                onClick={() => {
                  goTo(index - 1);
                }}
              >
                {t('taking.previous')}
              </Button>
            ) : (
              <span />
            )}
            {index < questions.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<ArrowForwardOutlined />}
                onClick={() => {
                  goTo(index + 1);
                }}
              >
                {t('taking.next')}
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<ArrowForwardOutlined />}
                onClick={() => {
                  setReviewing(true);
                }}
              >
                {t('taking.review')}
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('confirm.title', { count: unanswered })}
        description={t('confirm.body')}
        confirmLabel={t('confirm.submit')}
        cancelLabel={t('confirm.keepAnswering')}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          onSubmit();
        }}
      />
    </Stack>
  );
}

/** Numbered question buttons: answered / unanswered / current, each with a full label. */
function Navigator({
  count,
  current,
  isAnswered: answered,
  onSelect,
}: {
  count: number;
  current: number;
  isAnswered: (index: number) => boolean;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation('exam');
  return (
    <Box component="nav" aria-label={t('navigator.label')}>
      <Box
        component="ol"
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, listStyle: 'none', p: 0, m: 0 }}
      >
        {Array.from({ length: count }, (_, index) => {
          const isCurrent = index === current;
          const done = answered(index);
          return (
            <li key={index}>
              <Button
                variant={done ? 'contained' : 'outlined'}
                color={done ? 'primary' : 'inherit'}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={t(done ? 'navigator.answered' : 'navigator.notAnswered', {
                  number: index + 1,
                })}
                onClick={() => {
                  onSelect(index);
                }}
                sx={{
                  minWidth: 44,
                  height: 44,
                  px: 0,
                  fontWeight: isCurrent ? 700 : 500,
                  ...(isCurrent
                    ? { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '2px' }
                    : {}),
                  ...(done ? {} : { borderColor: 'divider', color: 'text.primary' }),
                }}
              >
                {index + 1}
              </Button>
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
