import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface SortableEntry {
  id: string;
  title: string;
}

/**
 * A vertical list reordered by dragging a handle, with the mouse, touch or the keyboard
 * (Space or Enter to pick up, arrows to move, Space or Enter to drop, Escape to cancel).
 * Moves are announced to screen readers in the interface language. `onReorder` gets the
 * complete id list in the new order.
 */
export function SortableList<T extends SortableEntry>({
  entries,
  onReorder,
  disabled = false,
  renderEntry,
  component = 'ol',
  label,
}: {
  entries: T[];
  onReorder: (ids: string[]) => void;
  disabled?: boolean;
  renderEntry: (entry: T, handle: ReactNode) => ReactNode;
  component?: 'ol' | 'ul';
  label: string;
}) {
  const { t } = useTranslation('editor');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = entries.map((entry) => entry.id);
  const titleOf = (id: UniqueIdentifier) => entries.find((entry) => entry.id === id)?.title ?? '';
  const positionOf = (id: UniqueIdentifier | undefined) =>
    id === undefined ? 0 : ids.indexOf(String(id)) + 1;
  const total = entries.length;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t('dnd.pickedUp', { title: titleOf(active.id), position: positionOf(active.id), total }),
    onDragOver: ({ active, over }) =>
      over
        ? t('dnd.movedTo', { title: titleOf(active.id), position: positionOf(over.id), total })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('dnd.dropped', { title: titleOf(active.id), position: positionOf(over.id), total })
        : t('dnd.cancelled', { title: titleOf(active.id) }),
    onDragCancel: ({ active }) => t('dnd.cancelled', { title: titleOf(active.id) }),
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('dnd.instructions') },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <Box
          component={component}
          aria-label={label}
          sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 0.5 }}
        >
          {entries.map((entry) => (
            <SortableRow
              key={entry.id}
              entry={entry}
              disabled={disabled}
              renderEntry={renderEntry}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow<T extends SortableEntry>({
  entry,
  disabled,
  renderEntry,
}: {
  entry: T;
  disabled: boolean;
  renderEntry: (entry: T, handle: ReactNode) => ReactNode;
}) {
  const { t } = useTranslation('editor');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled });

  const handle = disabled ? null : (
    <IconButton
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={t('dnd.handle', { title: entry.title })}
      sx={{ width: 44, height: 44, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      <DragIndicatorOutlined />
    </IconButton>
  );

  return (
    <Box
      component="li"
      ref={setNodeRef}
      sx={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 1 : 'auto',
        bgcolor: isDragging ? 'background.paper' : undefined,
        borderRadius: '10px',
        outline: isDragging ? '1px solid' : 'none',
        outlineColor: 'divider',
      }}
    >
      {renderEntry(entry, handle)}
    </Box>
  );
}
