import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { ITEM_ICONS } from '../../../courses';
import type { PreviewItem, PreviewModule } from '../api/moderation';

export interface CourseTreePreviewProps {
  modules: PreviewModule[];
  /** `lang` of the course content when it differs from the interface. */
  contentLang?: { lang?: string };
  /** Ids that exist on the live course; anything else is marked "New". Omit to mark nothing. */
  liveIds?: ReadonlySet<string>;
}

/**
 * Read-only render of a course's content for review, exam answers included (admin only).
 * Video ids appear only as a "Watch on YouTube" link; file keys never appear.
 */
export function CourseTreePreview({ modules, contentLang = {}, liveIds }: CourseTreePreviewProps) {
  const { t } = useTranslation('admin');
  const isNew = (id: string | undefined) => liveIds !== undefined && (!id || !liveIds.has(id));

  if (modules.length === 0) {
    return <Typography color="text.secondary">{t('tree.empty')}</Typography>;
  }
  return (
    <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {modules.map((module, moduleIndex) => (
        <Card component="li" key={module.id ?? `new-${String(moduleIndex)}`} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
              {t('tree.module', { number: moduleIndex + 1 })}{' '}
              <span {...contentLang}>{module.title}</span>
            </Typography>
            {isNew(module.id) ? <NewChip /> : null}
          </Stack>
          {module.description ? (
            <Typography
              color="text.secondary"
              {...contentLang}
              sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 720, mt: 0.5 }}
            >
              {module.description}
            </Typography>
          ) : null}
          {module.items.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('tree.noItems')}
            </Typography>
          ) : (
            <Stack
              component="ol"
              spacing={1.5}
              sx={{
                listStyle: 'none',
                p: 0,
                m: 0,
                mt: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                pt: 1.5,
              }}
            >
              {module.items.map((item, itemIndex) => (
                <Box component="li" key={item.id ?? `new-${String(itemIndex)}`}>
                  <ItemPreview item={item} isNew={isNew(item.id)} contentLang={contentLang} />
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      ))}
    </Stack>
  );
}

function NewChip() {
  const { t } = useTranslation('admin');
  return (
    <Chip
      size="small"
      label={t('tree.new')}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return { color: palette.diff.added.fg, backgroundColor: palette.diff.added.bg };
      }}
    />
  );
}

function ItemPreview({
  item,
  isNew,
  contentLang,
}: {
  item: PreviewItem;
  isNew: boolean;
  contentLang: { lang?: string };
}) {
  const { t } = useTranslation(['admin', 'courses']);
  const { formatDecimal, formatNumber } = useNumberFormat();
  const Icon = ITEM_ICONS[item.type];

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          component="span"
          aria-hidden
          sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 20 } }}
        >
          <Icon />
        </Box>
        <Typography sx={{ fontWeight: 500 }}>
          <Box component="span" sx={visuallyHidden}>
            {t('courses:outline.typePrefix', { type: t(`courses:itemType.${item.type}`) })}
          </Box>
          <span {...contentLang}>{item.title}</span>
        </Typography>
        {isNew ? <NewChip /> : null}
      </Stack>
      <Box sx={{ pl: 3.5 }}>
        {item.type === 'video' ? (
          <Stack spacing={0.5}>
            {item.youtubeTitle ? (
              <Typography variant="body2" color="text.secondary">
                {t('tree.video.title', { title: item.youtubeTitle })}
              </Typography>
            ) : null}
            {item.isAvailable === false ? (
              <Typography variant="body2" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <WarningAmberOutlined fontSize="small" aria-hidden />
                {t('tree.video.unavailable')}
              </Typography>
            ) : null}
            {item.youtubeVideoId ? (
              <Link
                variant="body2"
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(item.youtubeVideoId)}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('tree.video.watch')}
              </Link>
            ) : null}
          </Stack>
        ) : item.type === 'pdf' ? (
          <Typography variant="body2" color="text.secondary">
            {t('tree.pdf', {
              pages: formatNumber(item.pageCount ?? 0),
              count: item.pageCount ?? 0,
              size: formatDecimal((item.sizeBytes ?? 0) / 1_048_576),
            })}
          </Typography>
        ) : (
          <ExamPreview item={item} contentLang={contentLang} />
        )}
      </Box>
    </Stack>
  );
}

function ExamPreview({ item, contentLang }: { item: PreviewItem; contentLang: { lang?: string } }) {
  const { t } = useTranslation('admin');
  const questions = item.questions ?? [];
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {t('tree.exam.settings', {
          passing: item.passingScorePercent ?? 0,
          attempts:
            item.maxAttempts == null
              ? t('tree.exam.unlimited')
              : t('tree.exam.attempts', { count: item.maxAttempts }),
          time:
            item.timeLimitMinutes == null
              ? t('tree.exam.noTimeLimit')
              : t('tree.exam.minutes', { count: item.timeLimitMinutes }),
        })}
      </Typography>
      {item.instructions ? (
        <Typography
          variant="body2"
          {...contentLang}
          sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 720 }}
        >
          {item.instructions}
        </Typography>
      ) : null}
      {questions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('tree.exam.noQuestions')}
        </Typography>
      ) : (
        <Box component="details">
          <Box
            component="summary"
            sx={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}
          >
            {t('tree.exam.showQuestions', { count: questions.length })}
          </Box>
          <Stack component="ol" spacing={2} sx={{ pl: 3, m: 0, mt: 1, maxWidth: 720 }}>
            {questions.map((question, questionIndex) => (
              <li key={question.id ?? `new-${String(questionIndex)}`}>
                <Typography
                  {...contentLang}
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {question.prompt}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(question.isMultiple ? 'tree.exam.multiple' : 'tree.exam.single', {
                    count: question.points,
                  })}
                </Typography>
                <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.5 }}>
                  {question.choices.map((choice, choiceIndex) => (
                    <Stack
                      component="li"
                      key={choice.id ?? `new-${String(choiceIndex)}`}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start', fontWeight: choice.isCorrect ? 600 : 400 }}
                    >
                      {choice.isCorrect ? (
                        <CheckCircleOutlined
                          fontSize="small"
                          aria-hidden
                          sx={{ color: 'success.main', mt: 0.25 }}
                        />
                      ) : (
                        <RadioButtonUncheckedOutlined
                          fontSize="small"
                          aria-hidden
                          sx={{ color: 'text.secondary', mt: 0.25 }}
                        />
                      )}
                      <Typography
                        component="span"
                        {...contentLang}
                        sx={{ overflowWrap: 'anywhere', fontWeight: 'inherit' }}
                      >
                        {choice.text}
                        {choice.isCorrect ? (
                          <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                            {t('tree.exam.correct')}
                          </Box>
                        ) : null}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </li>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
