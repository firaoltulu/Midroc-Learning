import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import type { AuthoringView } from '../api/schemas';
import { READINESS_PROBLEMS, readinessProblems } from '../model/readiness';

/**
 * "Ready to submit?" beside the content: each check with a mark and, for screen readers and
 * anyone who can't tell the colors apart, "done" or "to do" in words.
 */
export function ReadinessCard({ view }: { view: AuthoringView }) {
  const { t } = useTranslation('editor');
  const open = readinessProblems(view);

  return (
    <Card
      component="aside"
      aria-labelledby="readiness-title"
      sx={{ position: { md: 'sticky' }, top: { md: 88 } }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography id="readiness-title" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('readiness.title')}
        </Typography>
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {READINESS_PROBLEMS.map((problem) => {
            const done = !open.includes(problem);
            const Icon = done ? CheckOutlined : CloseOutlined;
            return (
              <Stack
                key={problem}
                component="li"
                direction="row"
                spacing={1}
                sx={{ alignItems: 'flex-start', color: done ? 'primary.main' : 'error.main' }}
              >
                <Icon aria-hidden fontSize="small" sx={{ mt: '3px' }} />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  {t(`readiness.${done ? 'done' : 'open'}.${problem}`)}
                  <span style={visuallyHidden}>
                    {` (${done ? t('review.done') : t('review.toDo')})`}
                  </span>
                </Typography>
              </Stack>
            );
          })}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('readiness.note')}
        </Typography>
      </CardContent>
    </Card>
  );
}
