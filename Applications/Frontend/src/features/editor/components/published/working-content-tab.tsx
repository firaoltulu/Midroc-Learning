import AddOutlined from '@mui/icons-material/AddOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { ITEM_ICONS } from '../../../courses';
import { useKeyText } from '../../lib/key-text';
import { copyProblems, type CopyProblem, type WorkingItem } from '../../model/working-copy';
import { useWorkingCopy } from '../../model/working-copy-store';
import { SortableList } from '../sortable-list';
import { WorkingAddItemDialog, WorkingAddModuleDialog } from './working-add-dialogs';
import { WorkingItemPanel } from './working-item-panel';
import { WorkingModulePanel } from './working-module-panel';

/** The first problem to show under a tree row (always for structure, the rest after a submit attempt). */
function rowProblem(
  problems: CopyProblem[],
  key: string,
  submitAttempted: boolean,
  serverError: unknown,
): string | null {
  if (serverError) return 'editor:working.problems.serverItem';
  const found = problems.find((problem) => problem.key === key);
  if (!found) return null;
  const structural = [
    'editor:working.problems.emptyModule',
    'editor:questions.errors.noQuestions',
    'validation:VIDEO_LINK_REQUIRED.default',
  ].includes(found.message);
  return structural || submitAttempted ? found.message : null;
}

/**
 * Content of a published course: the working copy's tree (drag handles with keyboard
 * support, Move up/down, moving items between modules) next to the selected module's or
 * item's editor. Nothing here is live until the changes are approved, except titles and
 * module descriptions of content that is already live.
 */
export function WorkingContentTab({ courseId, readOnly }: { courseId: string; readOnly: boolean }) {
  const { t } = useTranslation(['editor', 'courses']);
  const keyText = useKeyText();
  const copy = useWorkingCopy((state) => state.copy);
  const selection = useWorkingCopy((state) => state.selection);
  const select = useWorkingCopy((state) => state.select);
  const orderModules = useWorkingCopy((state) => state.orderModules);
  const orderItems = useWorkingCopy((state) => state.orderItems);
  const submitAttempted = useWorkingCopy((state) => state.submitAttempted);
  const itemErrors = useWorkingCopy((state) => state.itemErrors);
  const [addingModule, setAddingModule] = useState(false);
  const [addingItemTo, setAddingItemTo] = useState<{ key: string; title: string } | null>(null);
  const problems = copyProblems(copy);

  const modules = copy.modules;
  const selectedModule =
    selection?.kind === 'module'
      ? modules.find((module) => module.key === selection.key)
      : undefined;
  const itemParent =
    selection?.kind === 'item'
      ? modules.find((module) => module.items.some((item) => item.key === selection.key))
      : undefined;
  const selectedItem = itemParent?.items.find((item) => item.key === selection?.key);

  const itemRow = (item: WorkingItem, handle: React.ReactNode) => {
    const Icon = ITEM_ICONS[item.type];
    const selected = selection?.kind === 'item' && selection.key === item.key;
    const problem = rowProblem(problems, item.key, submitAttempted, itemErrors[item.key]);
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        {handle}
        <ListItemButton
          selected={selected}
          aria-current={selected ? 'true' : undefined}
          onClick={() => {
            select({ kind: 'item', key: item.key });
          }}
          sx={{ borderRadius: '10px', minHeight: 44, gap: 1.5 }}
        >
          <Box component="span" sx={{ display: 'flex', color: 'text.secondary' }} aria-hidden>
            <Icon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="span" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
              <Box component="span" sx={visuallyHidden}>
                {t('courses:outline.typePrefix', { type: t(`courses:itemType.${item.type}`) })}
              </Box>{' '}
              {item.title || t('working.untitled')}
            </Typography>
            {item.id ? null : (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {t('working.new')}
              </Typography>
            )}
            {problem ? (
              <Typography
                component="span"
                variant="body2"
                sx={{ display: 'block', color: 'warning.main' }}
              >
                {keyText(problem)}
              </Typography>
            ) : null}
          </Box>
        </ListItemButton>
      </Stack>
    );
  };

  const tree =
    modules.length === 0 ? (
      <EmptyState
        icon={<ViewModuleOutlined />}
        title={t('content.empty.title')}
        description={t('working.emptyTree')}
        action={
          readOnly ? undefined : (
            <Button
              variant="outlined"
              startIcon={<AddOutlined />}
              onClick={() => {
                setAddingModule(true);
              }}
            >
              {t('content.addModule')}
            </Button>
          )
        }
      />
    ) : (
      <Stack spacing={1}>
        <SortableList
          label={t('content.modules')}
          entries={modules.map((module) => ({ id: module.key, title: module.title, module }))}
          disabled={readOnly}
          onReorder={orderModules}
          renderEntry={({ module }, handle) => {
            const selected = selection?.kind === 'module' && selection.key === module.key;
            const problem = rowProblem(problems, module.key, submitAttempted, null);
            return (
              <Box sx={{ py: 0.5 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  {handle}
                  <ListItemButton
                    selected={selected}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => {
                      select({ kind: 'module', key: module.key });
                    }}
                    sx={{ borderRadius: '10px', minHeight: 44 }}
                  >
                    <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                      {module.title || t('working.untitled')}
                    </Typography>
                  </ListItemButton>
                </Stack>
                <Box sx={{ pl: readOnly ? 2 : 5.5 }}>
                  {problem ? (
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 0.5,
                        color: 'warning.main',
                      }}
                    >
                      <ErrorOutlineOutlined aria-hidden fontSize="small" />
                      {keyText(problem)}
                    </Typography>
                  ) : null}
                  {module.items.length > 0 ? (
                    <SortableList
                      label={t('content.itemsOf', { title: module.title })}
                      entries={module.items.map((item) => ({
                        id: item.key,
                        title: item.title,
                        item,
                      }))}
                      disabled={readOnly}
                      onReorder={(keys) => {
                        orderItems(module.key, keys);
                      }}
                      renderEntry={({ item }, itemHandle) => itemRow(item, itemHandle)}
                    />
                  ) : null}
                  {readOnly ? null : (
                    <Button
                      size="small"
                      startIcon={<AddOutlined />}
                      onClick={() => {
                        setAddingItemTo({ key: module.key, title: module.title });
                      }}
                      sx={{ ml: 1, mt: 0.5 }}
                    >
                      {t('content.addItem')}
                    </Button>
                  )}
                </Box>
              </Box>
            );
          }}
        />
        {readOnly ? null : (
          <Button
            variant="outlined"
            startIcon={<AddOutlined />}
            onClick={() => {
              setAddingModule(true);
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('content.addModule')}
          </Button>
        )}
      </Stack>
    );

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 380px) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <Card component="nav" aria-label={t('content.treeLabel')} sx={{ p: 1.5 }}>
        {tree}
      </Card>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        {selectedItem && itemParent ? (
          <WorkingItemPanel
            key={selectedItem.key}
            courseId={courseId}
            item={selectedItem}
            moduleKey={itemParent.key}
            readOnly={readOnly}
          />
        ) : selectedModule ? (
          <WorkingModulePanel
            key={selectedModule.key}
            courseId={courseId}
            module={selectedModule}
            readOnly={readOnly}
          />
        ) : (
          <Typography color="text.secondary">
            {modules.length === 0 ? t('content.startHint') : t('content.selectHint')}
          </Typography>
        )}
      </Card>

      <WorkingAddModuleDialog
        open={addingModule}
        onClose={() => {
          setAddingModule(false);
        }}
      />
      {addingItemTo ? (
        <WorkingAddItemDialog
          moduleKey={addingItemTo.key}
          moduleTitle={addingItemTo.title}
          open
          onClose={() => {
            setAddingItemTo(null);
          }}
        />
      ) : null}
    </Box>
  );
}
