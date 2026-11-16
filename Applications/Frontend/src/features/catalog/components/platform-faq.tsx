import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './scroll-reveal';

const FAQ_ITEMS = ['gettingStarted', 'languages', 'progress', 'courseCreation'] as const;

export function PlatformFaq() {
  const { t } = useTranslation('catalog');

  return (
    <Stack component="section" aria-labelledby="platform-faq-title" spacing={2.5}>
      <ScrollReveal>
        <Stack spacing={0.75}>
          <Typography
            id="platform-faq-title"
            variant="h2"
            component="h2"
            sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 700 }}
          >
            {t('guest.faq.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {t('guest.faq.intro')}
          </Typography>
        </Stack>
      </ScrollReveal>

      <Stack spacing={1.25}>
        {FAQ_ITEMS.map((id, index) => {
          const summaryId = `platform-faq-${id}-summary`;
          const panelId = `platform-faq-${id}-panel`;

          return (
            <ScrollReveal key={id} delay={index * 60}>
              <Accordion
                disableGutters
                elevation={0}
                sx={(theme) => ({
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '10px !important',
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  boxShadow: 'none',
                  transition: theme.transitions.create('border-color', {
                    duration: theme.transitions.duration.short,
                  }),
                  '&::before': { display: 'none' },
                  '&.Mui-expanded': { m: 0, borderColor: 'primary.main' },
                })}
              >
                <AccordionSummary
                  id={summaryId}
                  aria-controls={panelId}
                  expandIcon={<ExpandMoreOutlined />}
                  sx={{
                    minHeight: { xs: 60, sm: 68 },
                    px: { xs: 2, sm: 2.5 },
                    '&.Mui-expanded': { minHeight: { xs: 60, sm: 68 } },
                    '& .MuiAccordionSummary-content': { my: 1.75, minWidth: 0 },
                    '& .MuiAccordionSummary-content.Mui-expanded': { my: 1.75 },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: { xs: '1rem', sm: '1.0625rem' },
                      fontWeight: 600,
                      lineHeight: 1.5,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {t(`guest.faq.items.${id}.question`)}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
                  <Typography
                    color="text.secondary"
                    sx={{ maxWidth: '70ch', lineHeight: 1.75, overflowWrap: 'anywhere' }}
                  >
                    {t(`guest.faq.items.${id}.answer`)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </ScrollReveal>
          );
        })}
      </Stack>
    </Stack>
  );
}
