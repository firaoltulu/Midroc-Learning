import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { PageHeader } from '../../../shared/ui/page-header';

export interface InfoSection {
  id: string;
  heading: string;
  /** Paragraphs are separated by a blank line. */
  body: string;
}

export interface InfoPageProps {
  title: string;
  intro: string;
  sections: InfoSection[];
  /** For the privacy notice and the terms: when the text last changed. */
  updatedAt?: string;
}

/** A plain reading page: title, intro, optional "Last updated", then headed sections. */
export function InfoPage({ title, intro, sections, updatedAt }: InfoPageProps) {
  const { t } = useTranslation('site');
  const { formatDate } = useDateFormat();

  return (
    <Stack spacing={4} sx={{ maxWidth: 720 }}>
      <div>
        <PageHeader title={title} description={intro} />
        {updatedAt ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
            {t('lastUpdated', { date: formatDate(updatedAt) })}
          </Typography>
        ) : null}
      </div>
      {sections.map((section) => (
        <Stack key={section.id} component="section" spacing={1.5}>
          <Typography variant="h4" component="h2">
            {section.heading}
          </Typography>
          {section.body.split('\n\n').map((paragraph) => (
            <Typography key={paragraph}>{paragraph}</Typography>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
