import LanguageIcon from '@mui/icons-material/Language';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { Box, Card, CardContent, Container, IconButton, Stack, Typography } from '@mui/material';
import { useLanguage } from '../../shared/i18n/language-provider';

export function HomePage() {
  const { language, messages, toggleLanguage } = useLanguage();

  return (
    <Box component="main" id="main-content" sx={{ minHeight: '100vh' }}>
      <Box
        component="header"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            minHeight: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              aria-hidden="true"
              sx={{
                width: 40,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2.5,
                color: 'primary.contrastText',
                backgroundColor: 'primary.main'
              }}
            >
              <AutoStoriesOutlinedIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {messages.brand}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <LanguageIcon fontSize="small" color="action" aria-hidden="true" />
            <IconButton
              aria-label={`${messages.languageLabel}: ${language === 'en' ? messages.languageAmharic : messages.languageEnglish}`}
              onClick={toggleLanguage}
              sx={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 2,
                color: 'primary.dark',
                fontSize: '0.875rem',
                fontWeight: 700
              }}
            >
              {language === 'en' ? messages.switchToAmharic : messages.switchToEnglish}
            </IconButton>
          </Stack>
        </Container>
      </Box>

      <Container
        component="section"
        aria-label={messages.welcome}
        maxWidth="lg"
        sx={{ py: { xs: 5, md: 9 } }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)' },
            alignItems: 'center',
            gap: { xs: 5, md: 8 }
          }}
        >
          <Stack spacing={3} maxWidth={680}>
            <Typography
              variant="overline"
              color="primary.dark"
              fontWeight={700}
              letterSpacing="0.12em"
            >
              {messages.welcome}
            </Typography>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4.25rem' },
                lineHeight: 1.08,
                maxWidth: '12ch'
              }}
            >
              {messages.headline}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.75, maxWidth: 560 }}
            >
              {messages.description}
            </Typography>
          </Stack>

          <Card
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 300, sm: 340 },
              border: 1,
              borderColor: 'divider',
              backgroundColor: 'background.paper'
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                width: 230,
                height: 230,
                borderRadius: '50%',
                top: -85,
                right: -55,
                backgroundColor: 'primary.light',
                opacity: 0.72
              }}
            />
            <CardContent
              sx={{
                position: 'relative',
                minHeight: { xs: 300, sm: 340 },
                p: { xs: 3, sm: 4 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {messages.nextStepLabel}
                </Typography>
                <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
                  {messages.nextStepTitle}
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 56,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'secondary.main'
                  }}
                />
                <Typography color="text.secondary" lineHeight={1.7}>
                  {messages.nextStepDescription}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {messages.comingSoon}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
