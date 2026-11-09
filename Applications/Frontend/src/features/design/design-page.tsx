import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useToast } from '../../shared/ui/toast-provider';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { CardSkeleton } from '../../shared/ui/skeletons';
import { StatusChip, type Status } from '../../shared/ui/status-chip';

const statuses: Status[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
  'active',
  'suspended',
  'completed',
  'not_started'
];

interface ThemePreviewProps {
  mode: 'light' | 'dark';
  title: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  skeletonLabel: string;
  confirmLabel: string;
  onOpenDialog: () => void;
}

function ThemePreview({
  mode,
  title,
  emptyStateTitle,
  emptyStateDescription,
  skeletonLabel,
  confirmLabel,
  onOpenDialog
}: ThemePreviewProps) {
  return (
    <Box
      component="section"
      data-light={mode === 'light' ? '' : undefined}
      data-dark={mode === 'dark' ? '' : undefined}
      aria-label={title}
      sx={{
        minWidth: 0,
        p: { xs: 2, sm: 3 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'background.default',
        color: 'text.primary'
      }}
    >
      <Typography component="h2" variant="h3" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <PageHeader
              headingLevel={3}
              title={emptyStateTitle}
              description={emptyStateDescription}
            />
            <Stack direction="row" flexWrap="wrap" gap={1} aria-label={title}>
              {statuses.map((status) => (
                <StatusChip key={status} status={status} />
              ))}
            </Stack>
          </CardContent>
        </Card>
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          icon={<AutoStoriesOutlinedIcon fontSize="large" />}
        />
        <CardSkeleton label={skeletonLabel} />
        <Button variant="outlined" onClick={onOpenDialog}>
          {confirmLabel}
        </Button>
      </Stack>
    </Box>
  );
}

export function DesignPage() {
  const { t: tCommon } = useTranslation('common');
  const { t: tDesign } = useTranslation('design');
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  function confirmAction() {
    setDialogOpen(false);
    showToast(tCommon('confirmationComplete'));
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <PageHeader title={tDesign('title')} description={tDesign('description')} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 3
        }}
      >
        <ThemePreview
          mode="light"
          title={tDesign('lightThemePreview')}
          emptyStateTitle={tCommon('emptyTitle')}
          emptyStateDescription={tCommon('emptyDescription')}
          skeletonLabel={tCommon('skeletonPreview')}
          confirmLabel={tCommon('openDialog')}
          onOpenDialog={() => setDialogOpen(true)}
        />
        <ThemePreview
          mode="dark"
          title={tDesign('darkThemePreview')}
          emptyStateTitle={tCommon('emptyTitle')}
          emptyStateDescription={tCommon('emptyDescription')}
          skeletonLabel={tCommon('skeletonPreview')}
          confirmLabel={tCommon('openDialog')}
          onOpenDialog={() => setDialogOpen(true)}
        />
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title={tCommon('confirmTitle')}
        description={tCommon('confirmDescription')}
        confirmLabel={tCommon('confirm')}
        cancelLabel={tCommon('cancel')}
        onCancel={() => setDialogOpen(false)}
        onConfirm={confirmAction}
      />
    </Container>
  );
}
