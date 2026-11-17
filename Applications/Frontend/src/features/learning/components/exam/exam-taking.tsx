import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../../../shared/ui/brand/brand-logo';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import type { ExamSession } from '../../api/exams';
import { choose, isAnswered, type Answers } from '../../model/exam-answers';
import { PLAYER_BAR_HEIGHT } from '../../model/player-layout';
import { ExamTimer } from './exam-timer';

export interface ExamTakingProps {
  /** The exam item's title, shown in the top bar. */
  title: string;
  session: ExamSession;
  answers: Answers;
  onAnswersChange: (answers: Answers) => void;
  onSubmit: () => void;
  /** "Save and exit": answers are kept for this attempt; starting again resumes it. */
  onExit: () => void;
  submitting: boolean;
  submitError: string | null;
  contentLang: { lang?: string };
}

/**
 * Taking an exam, full screen: its own top bar (title, time left, Save and exit), a numbered
 * question navigator, one question at a time with large answer rows, a review step and the
 * timer's auto-submit.
 */
export function ExamTaking({
  title,
  session,
  answers,
  onAnswersChange,
  onSubmit,
  onExit,
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
  const titleId = useId();

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
  const isLast = index >= questions.length - 1;

  const submit = () => {
    if (unanswered > 0) setConfirming(true);
    else onSubmit();
  };
  const goTo = (target: number) => {
    setReviewing(false);
    setIndex(target);
  };

  return (
    <Dialog
      open
      fullScreen
      aria-labelledby={titleId}
      // No onClose: Escape doesn't leave; leaving is "Save and exit".
      transitionDuration={0}
      slotProps={{ paper: { sx: { bgcolor: 'background.default' } } }}
    >
      <Stack
        component="header"
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          height: PLAYER_BAR_HEIGHT,
          flexShrink: 0,
          alignItems: 'center',
          px: { xs: 1.5, sm: 3 },
          bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        }}
      >
        <BrandLogo variant="mark" height={28} decorative />
        <Typography
          id={titleId}
          component="p"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '1rem', sm: '1.125rem' },
            color: 'primary.main',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          {...contentLang}
        >
          {title}
        </Typography>
        {session.expiresAt ? (
          <ExamTimer
            expiresAt={session.expiresAt}
            clockOffset={session.clockOffset}
            onExpire={onSubmit}
          />
        ) : null}
        <Button
          variant="outlined"
          startIcon={<SaveOutlined />}
          onClick={onExit}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap', borderRadius: '10px' }}
        >
          {t('taking.saveAndExit')}
        </Button>
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: { xs: 3, sm: 5 } }}>
        <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
          <Box
            sx={{
              p: { xs: 1.25, sm: 1.75 },
              border: 1,
              borderColor: 'divider',
              borderRadius: '16px',
              bgcolor: 'surfaceMuted',
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                {t('taking.answeredCount', {
                  answered: questions.length - unanswered,
                  total: questions.length,
                })}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  questions.length ? ((questions.length - unanswered) / questions.length) * 100 : 0
                }
                aria-label={t('taking.answeredCount', {
                  answered: questions.length - unanswered,
                  total: questions.length,
                })}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'background.paper',
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
              <Navigator
                count={questions.length}
                current={reviewing ? -1 : index}
                isAnswered={(position) => {
                  const entry = questions[position];
                  return entry ? isAnswered(answers, entry.id) : false;
                }}
                onSelect={goTo}
              />
            </Stack>
          </Box>

          {reviewing || !question ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '16px',
                  bgcolor: 'surfaceMuted',
                }}
              >
                <Typography
                  ref={headingRef}
                  tabIndex={-1}
                  variant="h3"
                  component="h2"
                  sx={{ outline: 'none' }}
                >
                  {t('review.title')}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {unanswered > 0
                    ? t('review.unanswered', { count: unanswered })
                    : t('review.allAnswered')}
                </Typography>
              </Box>
              <List
                disablePadding
                sx={{
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '16px',
                }}
              >
                {questions.map((entry, position) => {
                  const answered = isAnswered(answers, entry.id);
                  return (
                    <ListItem
                      key={entry.id}
                      divider={position < questions.length - 1}
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
                      sx={{ py: 1.5, pr: 12 }}
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
                <Button
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  onClick={submit}
                  sx={{ borderRadius: '10px' }}
                >
                  {submitting ? t('review.submitting') : t('review.submit')}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '18px',
                  bgcolor: 'background.paper',
                  boxShadow: '0 8px 26px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* The caption is the heading that takes focus; the prompt is the group's legend (a
                legend always renders first in its fieldset, so the caption sits outside). */}
                <Typography
                  ref={headingRef}
                  tabIndex={-1}
                  component="h2"
                  variant="body2"
                  color="primary.main"
                  sx={{ outline: 'none', mb: 1.5, fontWeight: 600 }}
                >
                  {t('taking.questionMeta', {
                    question: t('taking.questionOf', {
                      number: index + 1,
                      total: questions.length,
                    }),
                    points: t('taking.points', { count: question.points }),
                    hint: question.isMultiple ? t('taking.selectAll') : t('taking.selectOne'),
                  })}
                </Typography>
                <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                  <Typography
                    component="legend"
                    sx={{
                      fontSize: { xs: '1.375rem', sm: '1.75rem' },
                      fontWeight: 700,
                      lineHeight: 1.3,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      p: 0,
                      mb: 3,
                    }}
                    {...contentLang}
                  >
                    {question.prompt}
                  </Typography>
                  <Stack
                    spacing={1.5}
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
                              sx={{
                                overflowWrap: 'anywhere',
                                whiteSpace: 'pre-wrap',
                                fontSize: '1.0625rem',
                              }}
                              {...contentLang}
                            >
                              {choice.text}
                            </Typography>
                          }
                          sx={{
                            m: 0,
                            minHeight: 60,
                            px: { xs: 1.25, sm: 1.75 },
                            py: 0.75,
                            border: selected ? 2 : 1,
                            borderRadius: '12px',
                            borderColor: selected ? 'primary.main' : 'inputBorder',
                            bgcolor: selected ? 'status.published.bg' : 'background.paper',
                            alignItems: 'center',
                            transition: (theme) =>
                              theme.transitions.create(
                                ['transform', 'border-color', 'background-color', 'box-shadow'],
                                { duration: theme.transitions.duration.short },
                              ),
                            '@media (hover: hover)': {
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                borderColor: 'primary.main',
                                boxShadow:
                                  '0 4px 12px rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
                              },
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              </Box>
              {submitError ? (
                <Alert severity="error" variant="outlined">
                  {submitError}
                </Alert>
              ) : null}
              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}
              >
                {index > 0 ? (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      goTo(index - 1);
                    }}
                  >
                    {t('taking.previous')}
                  </Button>
                ) : (
                  <span />
                )}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant={isLast ? 'contained' : 'outlined'}
                    onClick={() => {
                      setReviewing(true);
                    }}
                    sx={{ borderRadius: '10px' }}
                  >
                    {t('taking.review')}
                  </Button>
                  {isLast ? null : (
                    <Button
                      variant="contained"
                      onClick={() => {
                        goTo(index + 1);
                      }}
                      sx={{ borderRadius: '10px' }}
                    >
                      {t('taking.next')}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>

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
    </Dialog>
  );
}

/** Numbered question buttons: answered (tinted), current (outlined), not yet (muted). */
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
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: isCurrent ? 700 : 600,
                  border: 2,
                  borderColor: isCurrent ? 'primary.main' : 'transparent',
                  bgcolor: isCurrent
                    ? 'background.paper'
                    : done
                      ? 'status.published.bg'
                      : 'surfaceMuted',
                  color: done || isCurrent ? 'primary.main' : 'text.secondary',
                  '&:hover': { borderColor: 'primary.main' },
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
