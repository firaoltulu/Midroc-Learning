import AddOutlined from '@mui/icons-material/AddOutlined';
import ViewModuleOutlined from '@mui/icons-material/ViewModuleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { EmptyState } from '../../../shared/ui/empty-state';
import { useToast } from '../../../shared/ui/toast/toast-context';
import type { ItemType } from '../../courses';
import { useReorderItems, useReorderModules } from '../api/authoring';
import type { AuthoringItem, AuthoringModule, AuthoringView } from '../api/schemas';
import { fromAuthoringItem, useItemMeta } from '../lib/item-meta';
import { move } from '../model/questions';
import { useSaveTracker } from '../model/save-tracker';
import { AddItemDialog, AddModuleDialog } from './add-dialogs';
import { AddItemButtons, EditPanel, ItemRow, ModuleCard } from './content-layout';
import { ItemPanel } from './item-panel';
import { ModulePanel } from './module-panel';
import { ReadinessCard } from './readiness-card';
import { SortableList } from './sortable-list';

export type Selection = { kind: 'module'; id: string } | { kind: 'item'; id: string } | null;

/** Needs attention before submitting: an exam without questions, a broken video. */
function itemWarning(item: AuthoringItem): 'noQuestions' | 'videoUnavailable' | null {
  if (item.type === 'exam' && (item.questions ?? []).length === 0) return 'noQuestions';
  if (item.type === 'video' && item.isAvailable === false) return 'videoUnavailable';
  return null;
}

/**
 * Content of a draft or rejected course: a card per module with its items (drag handles with
 * keyboard support; reordering sends the complete id list), "+ Video + PDF + Exam" and
 * "Add module", and "Ready to submit?" beside them. Rename / Edit open the module's or item's
 * editor in a side panel.
 */
export function ContentTab({
  view,
  readOnly,
  selection,
  onSelect,
}: {
  view: AuthoringView;
  readOnly: boolean;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const { t } = useTranslation(['editor', 'courses']);
  const courseId = view.course.id;
  const tracker = useSaveTracker();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const itemMeta = useItemMeta();
  const reorderModules = useReorderModules(courseId);
  const reorderItems = useReorderItems(courseId);
  const [addingModule, setAddingModule] = useState(false);
  const [addingItem, setAddingItem] = useState<{ module: AuthoringModule; type: ItemType } | null>(
    null,
  );

  const reportFailure = (error: unknown) => {
    toast.show({ message: errorMessage(error), severity: 'error' });
  };

  const saveModuleOrder = (moduleIds: string[]) => {
    tracker
      .run('structure', () => reorderModules.mutateAsync(moduleIds), { reportFailure: false })
      .catch(reportFailure);
  };
  const saveItemOrder = (moduleId: string, itemIds: string[]) => {
    tracker
      .run('structure', () => reorderItems.mutateAsync({ moduleId, itemIds }), {
        reportFailure: false,
      })
      .catch(reportFailure);
  };

  const modules = view.modules;
  const selectedModuleIndex =
    selection?.kind === 'module' ? modules.findIndex(({ id }) => id === selection.id) : -1;
  const selectedModule = modules[selectedModuleIndex];
  const itemParent =
    selection?.kind === 'item'
      ? modules.find((module) => module.items.some(({ id }) => id === selection.id))
      : undefined;
  const selectedItemIndex =
    itemParent && selection ? itemParent.items.findIndex(({ id }) => id === selection.id) : -1;
  const selectedItem = itemParent?.items[selectedItemIndex];
  const close = () => {
    onSelect(null);
  };

  const content =
    modules.length === 0 ? (
      <EmptyState
        icon={<ViewModuleOutlined />}
        title={t('content.empty.title')}
        description={t('content.empty.body')}
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
          entries={modules}
          disabled={readOnly}
          onReorder={saveModuleOrder}
          renderEntry={(module, handle) => (
            <ModuleCard
              number={modules.indexOf(module) + 1}
              title={module.title}
              handle={handle}
              itemCount={module.items.length}
              readOnly={readOnly}
              onRename={() => {
                onSelect({ kind: 'module', id: module.id });
              }}
              problem={module.items.length === 0 ? t('content.emptyModule') : null}
              footer={
                readOnly ? null : (
                  <AddItemButtons
                    moduleTitle={module.title}
                    onAdd={(type) => {
                      setAddingItem({ module, type });
                    }}
                  />
                )
              }
            >
              {module.items.length > 0 ? (
                <SortableList
                  label={t('content.itemsOf', { title: module.title })}
                  entries={module.items}
                  disabled={readOnly}
                  onReorder={(itemIds) => {
                    saveItemOrder(module.id, itemIds);
                  }}
                  renderEntry={(item, itemHandle) => {
                    const warning = itemWarning(item);
                    return (
                      <ItemRow
                        handle={itemHandle}
                        type={item.type}
                        title={item.title}
                        meta={itemMeta(fromAuthoringItem(item))}
                        notes={
                          warning
                            ? [{ text: t(`content.warning.${warning}`), tone: 'warning' }]
                            : []
                        }
                        readOnly={readOnly}
                        onEdit={() => {
                          onSelect({ kind: 'item', id: item.id });
                        }}
                      />
                    );
                  }}
                />
              ) : null}
            </ModuleCard>
          )}
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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
        alignItems: 'start',
      }}
    >
      <Box component="section" aria-label={t('content.treeLabel')} sx={{ minWidth: 0 }}>
        {content}
      </Box>
      <ReadinessCard view={view} />

      <EditPanel
        open={Boolean(selectedItem ?? selectedModule)}
        title={
          selectedItem
            ? t('content.editItemTitle', {
                type: t(`courses:itemType.${selectedItem.type}`),
                title: selectedItem.title,
              })
            : selectedModule
              ? t('content.moduleLabel', {
                  number: selectedModuleIndex + 1,
                  title: selectedModule.title,
                })
              : ''
        }
        onClose={close}
      >
        {itemParent && selectedItem ? (
          <ItemPanel
            key={selectedItem.id}
            courseId={courseId}
            item={selectedItem}
            position={selectedItemIndex}
            count={itemParent.items.length}
            readOnly={readOnly}
            onMove={(to) => {
              saveItemOrder(
                itemParent.id,
                move(
                  itemParent.items.map(({ id }) => id),
                  selectedItemIndex,
                  to,
                ),
              );
            }}
            onDeleted={close}
          />
        ) : selectedModule ? (
          <ModulePanel
            key={selectedModule.id}
            courseId={courseId}
            module={selectedModule}
            position={selectedModuleIndex}
            count={modules.length}
            readOnly={readOnly}
            onMove={(to) => {
              saveModuleOrder(
                move(
                  modules.map(({ id }) => id),
                  selectedModuleIndex,
                  to,
                ),
              );
            }}
            onDeleted={close}
          />
        ) : (
          <Typography color="text.secondary">{t('content.selectHint')}</Typography>
        )}
      </EditPanel>

      <AddModuleDialog
        courseId={courseId}
        open={addingModule}
        onClose={() => {
          setAddingModule(false);
        }}
        onAdded={() => {
          // The new module shows as a card; adding its first item is the next step.
        }}
      />
      {addingItem ? (
        <AddItemDialog
          courseId={courseId}
          moduleId={addingItem.module.id}
          moduleTitle={addingItem.module.title}
          initialType={addingItem.type}
          open
          onClose={() => {
            setAddingItem(null);
          }}
          onAdded={(itemId) => {
            onSelect({ kind: 'item', id: itemId });
          }}
        />
      ) : null}
    </Box>
  );
}
