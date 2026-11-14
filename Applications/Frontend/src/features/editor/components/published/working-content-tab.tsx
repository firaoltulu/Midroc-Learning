import AddOutlined from '@mui/icons-material/AddOutlined';
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../../shared/ui/empty-state';
import type { ItemType } from '../../../courses';
import { fromWorkingItem, useItemMeta } from '../../lib/item-meta';
import { useKeyText } from '../../lib/key-text';
import { copyProblems, type CopyProblem, type WorkingItem } from '../../model/working-copy';
import { useWorkingCopy } from '../../model/working-copy-store';
import { AddItemButtons, EditPanel, ItemRow, ModuleCard } from '../content-layout';
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
 * Content of a published course: the working copy as module cards (drag handles with keyboard
 * support; Move up/down and moving items between modules in the editors), each module's or
 * item's editor in a side panel. Nothing here is live until the changes are approved, except titles and
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
  const [addingItemTo, setAddingItemTo] = useState<{
    key: string;
    title: string;
    type: ItemType;
  } | null>(null);
  const itemMeta = useItemMeta();
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
    const problem = rowProblem(problems, item.key, submitAttempted, itemErrors[item.key]);
    const notes: Array<{ text: string; tone: 'muted' | 'warning' }> = [];
    if (!item.id) notes.push({ text: t('working.new'), tone: 'muted' });
    if (problem) notes.push({ text: keyText(problem) ?? '', tone: 'warning' });
    return (
      <ItemRow
        handle={handle}
        type={item.type}
        title={item.title || t('working.untitled')}
        meta={itemMeta(fromWorkingItem(item))}
        notes={notes}
        readOnly={readOnly}
        onEdit={() => {
          select({ kind: 'item', key: item.key });
        }}
      />
    );
  };

  const content =
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
            const problem = rowProblem(problems, module.key, submitAttempted, null);
            return (
              <ModuleCard
                number={modules.indexOf(module) + 1}
                title={module.title || t('working.untitled')}
                handle={handle}
                itemCount={module.items.length}
                readOnly={readOnly}
                onRename={() => {
                  select({ kind: 'module', key: module.key });
                }}
                problem={problem ? keyText(problem) : null}
                footer={
                  readOnly ? null : (
                    <AddItemButtons
                      moduleTitle={module.title}
                      onAdd={(type) => {
                        setAddingItemTo({ key: module.key, title: module.title, type });
                      }}
                    />
                  )
                }
              >
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
              </ModuleCard>
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

  const panelTitle = selectedItem
    ? t('content.editItemTitle', {
        type: t(`courses:itemType.${selectedItem.type}`),
        title: selectedItem.title || t('working.untitled'),
      })
    : selectedModule
      ? t('content.moduleLabel', {
          number: modules.indexOf(selectedModule) + 1,
          title: selectedModule.title || t('working.untitled'),
        })
      : '';

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Box component="section" aria-label={t('content.treeLabel')}>
        {content}
      </Box>

      <EditPanel
        open={Boolean(selectedItem ?? selectedModule)}
        title={panelTitle}
        onClose={() => {
          select(null);
        }}
      >
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
          <Typography color="text.secondary">{t('content.selectHint')}</Typography>
        )}
      </EditPanel>

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
          initialType={addingItemTo.type}
          open
          onClose={() => {
            setAddingItemTo(null);
          }}
        />
      ) : null}
    </Box>
  );
}
