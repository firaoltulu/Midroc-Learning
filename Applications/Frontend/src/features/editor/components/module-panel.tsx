import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { useDeleteModule, useUpdateModule } from '../api/authoring';
import type { AuthoringModule } from '../api/schemas';
import { MODULE_DESCRIPTION_MAX, TITLE_MAX, titleProblem, tooLong } from '../model/limits';
import { useSaveTracker } from '../model/save-tracker';
import { AutosaveTextField } from './autosave-text-field';
import { MoveButtons } from './move-buttons';

/** The selected module: title, description, move and delete (with its items). */
export function ModulePanel({
  courseId,
  module,
  position,
  count,
  onMove,
  onDeleted,
  readOnly,
}: {
  courseId: string;
  module: AuthoringModule;
  position: number;
  count: number;
  onMove: (to: number) => void;
  onDeleted: () => void;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  const update = useUpdateModule(courseId);
  const remove = useDeleteModule(courseId);
  const tracker = useSaveTracker();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [confirming, setConfirming] = useState(false);

  return (
    <Stack spacing={3} component="section" aria-labelledby={`module-${module.id}-heading`}>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {t('module.label', { number: position + 1 })}
        </Typography>
        <Typography
          id={`module-${module.id}-heading`}
          variant="h3"
          component="h2"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {module.title}
        </Typography>
      </Stack>
      <AutosaveTextField
        slot={`module:${module.id}.title`}
        label={t('module.title')}
        savedValue={module.title}
        save={(value) =>
          update.mutateAsync({ moduleId: module.id, patch: { title: value.trim() } })
        }
        validate={titleProblem}
        maxLength={TITLE_MAX}
        readOnly={readOnly}
        required
      />
      <AutosaveTextField
        slot={`module:${module.id}.description`}
        label={t('module.description')}
        hint={t('module.descriptionHint')}
        savedValue={module.description}
        save={(value) => update.mutateAsync({ moduleId: module.id, patch: { description: value } })}
        validate={tooLong(MODULE_DESCRIPTION_MAX)}
        maxLength={MODULE_DESCRIPTION_MAX}
        readOnly={readOnly}
        multiline
        minRows={3}
      />

      {readOnly ? null : (
        <>
          <Divider />
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}
          >
            <MoveButtons
              position={position}
              count={count}
              onMove={onMove}
              upLabel={t('module.moveUp')}
              downLabel={t('module.moveDown')}
            />
            <Button
              color="error"
              onClick={() => {
                setConfirming(true);
              }}
            >
              {t('module.delete')}
            </Button>
          </Stack>
          <ConfirmDialog
            open={confirming}
            tone="danger"
            title={t('module.deleteTitle', { title: module.title })}
            description={t('module.deleteBody', { count: module.items.length })}
            confirmLabel={t('module.delete')}
            onClose={() => {
              setConfirming(false);
            }}
            onConfirm={async () => {
              try {
                await tracker.run('structure', () => remove.mutateAsync(module.id), {
                  reportFailure: false,
                });
                setConfirming(false);
                onDeleted();
              } catch (error) {
                setConfirming(false);
                toast.show({ message: errorMessage(error), severity: 'error' });
              }
            }}
          />
        </>
      )}
    </Stack>
  );
}
