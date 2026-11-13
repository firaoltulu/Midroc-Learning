import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../../shared/ui/form-text-field';
import { useUpdateModule } from '../../api/authoring';
import { useEffectHint } from '../../lib/effect-hint';
import { fieldEffect } from '../../model/field-effects';
import { MODULE_DESCRIPTION_MAX, TITLE_MAX, titleProblem, tooLong } from '../../model/limits';
import type { WorkingModule } from '../../model/working-copy';
import { useWorkingCopy } from '../../model/working-copy-store';
import { AutosaveTextField } from '../autosave-text-field';
import { MoveButtons } from '../move-buttons';

/**
 * A module of the working copy. A live module's title and description apply right away
 * (and are kept in the copy too); a new module's go with the changes. Moving and removing
 * need review.
 */
export function WorkingModulePanel({
  courseId,
  module,
  readOnly,
}: {
  courseId: string;
  module: WorkingModule;
  readOnly: boolean;
}) {
  const { t } = useTranslation('editor');
  const effectHint = useEffectHint();
  const update = useUpdateModule(courseId);
  const modules = useWorkingCopy((state) => state.copy.modules);
  const updateModule = useWorkingCopy((state) => state.updateModule);
  const moveModule = useWorkingCopy((state) => state.moveModule);
  const removeModule = useWorkingCopy((state) => state.removeModule);
  const select = useWorkingCopy((state) => state.select);
  const position = modules.findIndex((entry) => entry.key === module.key);
  const isNew = !module.id;
  const textEffect = fieldEffect('module', 'title', isNew);

  return (
    <Stack spacing={3} component="section" aria-labelledby={`module-${module.key}-heading`}>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {isNew
            ? t('working.newModuleLabel', { number: position + 1 })
            : t('module.label', { number: position + 1 })}
        </Typography>
        <Typography
          id={`module-${module.key}-heading`}
          variant="h3"
          component="h2"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {module.title || t('working.untitled')}
        </Typography>
      </Stack>

      {module.id ? (
        <>
          <AutosaveTextField
            slot={`module:${module.id}.title`}
            label={t('module.title')}
            hint={effectHint(textEffect)}
            savedValue={module.title}
            save={async (value) => {
              await update.mutateAsync({
                moduleId: module.id ?? '',
                patch: { title: value.trim() },
              });
              updateModule(module.key, { title: value.trim() });
            }}
            validate={titleProblem}
            maxLength={TITLE_MAX}
            readOnly={readOnly}
            required
          />
          <AutosaveTextField
            slot={`module:${module.id}.description`}
            label={t('module.description')}
            hint={effectHint(textEffect, t('module.descriptionHint'))}
            savedValue={module.description}
            save={async (value) => {
              await update.mutateAsync({
                moduleId: module.id ?? '',
                patch: { description: value },
              });
              updateModule(module.key, { description: value });
            }}
            validate={tooLong(MODULE_DESCRIPTION_MAX)}
            maxLength={MODULE_DESCRIPTION_MAX}
            readOnly={readOnly}
            multiline
            minRows={3}
          />
        </>
      ) : (
        <>
          <FormTextField
            label={t('module.title')}
            hint={effectHint(textEffect)}
            value={module.title}
            disabled={readOnly}
            required
            onChange={(event) => {
              updateModule(module.key, { title: event.target.value });
            }}
            errorKey={titleProblem(module.title) ?? undefined}
          />
          <FormTextField
            label={t('module.description')}
            hint={effectHint(textEffect, t('module.descriptionHint'))}
            value={module.description}
            disabled={readOnly}
            multiline
            minRows={3}
            onChange={(event) => {
              updateModule(module.key, { description: event.target.value });
            }}
            errorKey={tooLong(MODULE_DESCRIPTION_MAX)(module.description) ?? undefined}
          />
        </>
      )}

      {readOnly ? null : (
        <>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            {t('working.structureHint')}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}
          >
            <MoveButtons
              position={position}
              count={modules.length}
              onMove={(to) => {
                moveModule(position, to);
              }}
              upLabel={t('module.moveUp')}
              downLabel={t('module.moveDown')}
            />
            <Button
              color="error"
              onClick={() => {
                removeModule(module.key);
                select(null);
              }}
            >
              {t('working.removeModule')}
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
