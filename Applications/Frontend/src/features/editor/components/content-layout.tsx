import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import ExpandLessOutlined from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemType } from '../../courses';

/*
 * The Content tab's building blocks, shared by the draft and the published editor: a card per
 * module (drag handle, "Module 1 · Title", Rename, its items, "+ Video + PDF + Exam"), a row
 * per item (drag handle, type chip, title, a short summary, Edit) and the side panel where a
 * module or item is edited.
 */

const TYPE_TONE: Record<ItemType, 'published' | 'pending'> = {
  video: 'published',
  pdf: 'published',
  exam: 'pending',
};

/** "Video" / "PDF" / "Exam" as a small tinted chip (the type is in the text, not only color). */
export function TypeChip({ type }: { type: ItemType }) {
  const { t } = useTranslation('courses');
  const tone = TYPE_TONE[type];
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        px: 1,
        py: 0.25,
        borderRadius: '6px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.5,
        bgcolor: `status.${tone}.bg`,
        color: `status.${tone}.fg`,
      }}
    >
      {t(`itemType.${type}`)}
    </Box>
  );
}

export function ModuleCard({
  number,
  title,
  handle,
  itemCount,
  onRename,
  readOnly,
  problem,
  children,
  footer,
}: {
  number: number;
  title: string;
  handle: ReactNode;
  itemCount: number;
  onRename: () => void;
  readOnly: boolean;
  /** Needs attention (an empty module, ...). */
  problem?: string | null;
  /** The items. */
  children: ReactNode;
  /** "+ Video + PDF + Exam". */
  footer?: ReactNode;
}) {
  const { t } = useTranslation('editor');
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const label = t('content.moduleLabel', { number, title });

  return (
    <Card sx={{ my: 0.75 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', px: 1.5, py: 1, minHeight: 56 }}
      >
        {handle}
        <Typography
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: '1.0625rem',
            flex: 1,
            minWidth: 0,
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </Typography>
        {open ? null : (
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {t('content.itemCount', { count: itemCount })}
          </Typography>
        )}
        <Button
          size="small"
          onClick={onRename}
          sx={{ flexShrink: 0, fontWeight: 700, minHeight: 44 }}
        >
          {readOnly ? t('content.view') : t('content.rename')}{' '}
          <Box component="span" sx={visuallyHidden}>
            {t('content.moduleSuffix', { title })}
          </Box>
        </Button>
        <IconButton
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t('content.collapse', { title }) : t('content.expand', { title })}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {open ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
        </IconButton>
      </Stack>
      {open ? (
        <Box id={bodyId}>
          {problem ? (
            <Typography
              variant="body2"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                pb: 1,
                color: 'warning.main',
              }}
            >
              <ErrorOutlineOutlined aria-hidden fontSize="small" />
              {problem}
            </Typography>
          ) : null}
          {children}
          {footer ? (
            <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>{footer}</Box>
          ) : null}
        </Box>
      ) : null}
    </Card>
  );
}

export function ItemRow({
  handle,
  type,
  title,
  meta,
  notes,
  onEdit,
  readOnly,
}: {
  handle: ReactNode;
  type: ItemType;
  title: string;
  /** "Verified", "12 pages · 1.4 MB", "5 questions · pass 60%". */
  meta: string | null;
  /** Lines under the title: "New", a warning... */
  notes?: Array<{ text: string; tone: 'muted' | 'warning' }>;
  onEdit: () => void;
  readOnly: boolean;
}) {
  const { t } = useTranslation(['editor', 'courses']);
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        px: 1.5,
        py: 1,
        minHeight: 56,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      {handle}
      <TypeChip type={type} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ overflowWrap: 'anywhere' }}>{title}</Typography>
        {notes?.map((note) => (
          <Typography
            key={note.text}
            variant="body2"
            sx={{ color: note.tone === 'warning' ? 'warning.main' : 'text.secondary' }}
          >
            {note.text}
          </Typography>
        ))}
      </Box>
      {meta ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
        >
          {meta}
        </Typography>
      ) : null}
      <Button size="small" onClick={onEdit} sx={{ flexShrink: 0, fontWeight: 700, minHeight: 44 }}>
        {readOnly ? t('editor:content.view') : t('editor:content.edit')}{' '}
        <Box component="span" sx={visuallyHidden}>
          {`${t('courses:outline.typePrefix', { type: t(`courses:itemType.${type}`) })}${title}`}
        </Box>
      </Button>
    </Stack>
  );
}

const ITEM_TYPES: ItemType[] = ['video', 'pdf', 'exam'];

/** "+ Video", "+ PDF", "+ Exam": each opens the add dialog with that type chosen. */
export function AddItemButtons({
  moduleTitle,
  onAdd,
}: {
  moduleTitle: string;
  onAdd: (type: ItemType) => void;
}) {
  const { t } = useTranslation(['editor', 'courses']);
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {ITEM_TYPES.map((type) => (
        <Button
          key={type}
          variant="outlined"
          startIcon={<AddOutlined />}
          onClick={() => {
            onAdd(type);
          }}
        >
          {t(`courses:itemType.${type}`)}{' '}
          <Box component="span" sx={visuallyHidden}>
            {t('editor:content.addTypeSuffix', { title: moduleTitle })}
          </Box>
        </Button>
      ))}
    </Stack>
  );
}

/**
 * The module or item editor, in a panel on the right (full width on phones). Not modal: the
 * cards stay usable, so the author can reorder or open another item while it is open. It
 * takes focus when it opens or switches to another entry; Escape or Close closes it.
 */
export function EditPanel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation('editor');
  const titleId = useId();
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, title]);

  if (!open) return null;
  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      sx={(theme) => ({
        position: 'fixed',
        top: 64,
        right: 0,
        bottom: 0,
        width: { xs: '100%', sm: 520 },
        zIndex: theme.zIndex.drawer,
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
        overflow: 'auto',
      })}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          component="h2"
          sx={{ fontWeight: 700, flex: 1, minWidth: 0, outline: 'none' }}
          noWrap
        >
          {title}
        </Typography>
        <IconButton aria-label={t('content.closePanel')} onClick={onClose}>
          <CloseOutlined />
        </IconButton>
      </Stack>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    </Box>
  );
}
