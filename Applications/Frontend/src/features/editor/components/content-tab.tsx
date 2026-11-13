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
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { EmptyState } from '../../../shared/ui/empty-state';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { ITEM_ICONS } from '../../courses';
import { useReorderItems, useReorderModules } from '../api/authoring';
import type { AuthoringItem, AuthoringModule, AuthoringView } from '../api/schemas';
import { move } from '../model/questions';
import { useSaveTracker } from '../model/save-tracker';
import { AddItemDialog, AddModuleDialog } from './add-dialogs';
import { ItemPanel } from './item-panel';
import { ModulePanel } from './module-panel';
import { SortableList } from './sortable-list';

export type Selection = { kind: 'module'; id: string } | { kind: 'item'; id: string } | null;

/** Needs attention before submitting: an empty module, an exam without questions, a broken video. */
function itemWarning(item: AuthoringItem): 'noQuestions' | 'videoUnavailable' | null {
  if (item.type === 'exam' && (item.questions ?? []).length === 0) return 'noQuestions';
  if (item.type === 'video' && item.isAvailable === false) return 'videoUnavailable';
  return null;
}

/**
 * Content: the module/item tree (drag handles with keyboard support; reordering sends the
 * complete id list) next to the selected module's or item's editor.
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
  const reorderModules = useReorderModules(courseId);
  const reorderItems = useReorderItems(courseId);
  const [addingModule, setAddingModule] = useState(false);
  const [addingItemTo, setAddingItemTo] = useState<AuthoringModule | null>(null);

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

  const tree =
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
            <Box sx={{ py: 0.5 }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {handle}
                <ListItemButton
                  selected={selection?.kind === 'module' && selection.id === module.id}
                  aria-current={
                    selection?.kind === 'module' && selection.id === module.id ? 'true' : undefined
                  }
                  onClick={() => {
                    onSelect({ kind: 'module', id: module.id });
                  }}
                  sx={{ borderRadius: '10px', minHeight: 44 }}
                >
                  <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {module.title}
                  </Typography>
                </ListItemButton>
              </Stack>
              <Box sx={{ pl: readOnly ? 2 : 5.5 }}>
                {module.items.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}
                  >
                    <ErrorOutlineOutlined aria-hidden fontSize="small" />
                    {t('content.emptyModule')}
                  </Typography>
                ) : (
                  <SortableList
                    label={t('content.itemsOf', { title: module.title })}
                    entries={module.items}
                    disabled={readOnly}
                    onReorder={(itemIds) => {
                      saveItemOrder(module.id, itemIds);
                    }}
                    renderEntry={(item, itemHandle) => {
                      const Icon = ITEM_ICONS[item.type];
                      const warning = itemWarning(item);
                      const selected = selection?.kind === 'item' && selection.id === item.id;
                      return (
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          {itemHandle}
                          <ListItemButton
                            selected={selected}
                            aria-current={selected ? 'true' : undefined}
                            onClick={() => {
                              onSelect({ kind: 'item', id: item.id });
                            }}
                            sx={{ borderRadius: '10px', minHeight: 44, gap: 1.5 }}
                          >
                            <Box
                              component="span"
                              sx={{ display: 'flex', color: 'text.secondary' }}
                              aria-hidden
                            >
                              <Icon />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                component="span"
                                sx={{ display: 'block', overflowWrap: 'anywhere' }}
                              >
                                <Box component="span" sx={visuallyHidden}>
                                  {t('courses:outline.typePrefix', {
                                    type: t(`courses:itemType.${item.type}`),
                                  })}
                                </Box>{' '}
                                {item.title}
                              </Typography>
                              {warning ? (
                                <Typography
                                  component="span"
                                  variant="body2"
                                  sx={{ display: 'block', color: 'warning.main' }}
                                >
                                  {t(`content.warning.${warning}`)}
                                </Typography>
                              ) : null}
                            </Box>
                          </ListItemButton>
                        </Stack>
                      );
                    }}
                  />
                )}
                {readOnly ? null : (
                  <Button
                    size="small"
                    startIcon={<AddOutlined />}
                    onClick={() => {
                      setAddingItemTo(module);
                    }}
                    sx={{ ml: 1, mt: 0.5 }}
                  >
                    {t('content.addItem')}
                  </Button>
                )}
              </Box>
            </Box>
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
        gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 380px) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <Card component="nav" aria-label={t('content.treeLabel')} sx={{ p: 1.5 }}>
        {tree}
      </Card>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        {selectedItem ? (
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
            onDeleted={() => {
              onSelect({ kind: 'module', id: itemParent.id });
            }}
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
            onDeleted={() => {
              onSelect(null);
            }}
          />
        ) : (
          <Typography color="text.secondary">
            {modules.length === 0 ? t('content.startHint') : t('content.selectHint')}
          </Typography>
        )}
      </Card>

      <AddModuleDialog
        courseId={courseId}
        open={addingModule}
        onClose={() => {
          setAddingModule(false);
        }}
        onAdded={(moduleId) => {
          onSelect({ kind: 'module', id: moduleId });
        }}
      />
      {addingItemTo ? (
        <AddItemDialog
          courseId={courseId}
          moduleId={addingItemTo.id}
          moduleTitle={addingItemTo.title}
          open
          onClose={() => {
            setAddingItemTo(null);
          }}
          onAdded={(itemId) => {
            onSelect({ kind: 'item', id: itemId });
          }}
        />
      ) : null}
    </Box>
  );
}
