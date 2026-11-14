import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../shared/ui/error-state';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { notesQueryOptions, useNoteMutations, type Note } from '../api/notes';

/** The backend's limit (NoteCreate.body). */
const NOTE_MAX = 4000;

const bodyProblem = (text: string): 'required' | 'tooLong' | null =>
  !text.trim() ? 'required' : text.length > NOTE_MAX ? 'tooLong' : null;

/** Private notes on the item: write one, edit or delete them. Only the learner sees them. */
export function NotesPanel({ itemId }: { itemId: string }) {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const notes = useQuery(notesQueryOptions(itemId));
  const { add, edit, remove } = useNoteMutations(itemId);
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<'required' | 'tooLong' | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  const problemText = (value: 'required' | 'tooLong' | null) =>
    value === 'required'
      ? t('notes.required')
      : value === 'tooLong'
        ? t('notes.tooLong', { max: NOTE_MAX })
        : undefined;

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        {t('notes.private')}
      </Typography>
      <Stack
        component="form"
        noValidate
        spacing={1.5}
        sx={{ alignItems: 'flex-start' }}
        onSubmit={(event) => {
          event.preventDefault();
          const found = bodyProblem(text);
          setProblem(found);
          if (found) return;
          add.mutate(text.trim(), {
            onSuccess: () => {
              setText('');
              toast.show({ message: t('notes.saved'), severity: 'success' });
            },
          });
        }}
      >
        <TextField
          label={t('notes.newLabel')}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setProblem(null);
          }}
          multiline
          minRows={3}
          fullWidth
          error={Boolean(problem) || Boolean(add.error)}
          helperText={problemText(problem) ?? (add.error ? errorMessage(add.error) : undefined)}
        />
        <Button type="submit" variant="outlined" loading={add.isPending}>
          {t('notes.save')}
        </Button>
      </Stack>

      {notes.isPending ? (
        <LoadingRegion>
          <Skeleton variant="rounded" height={80} />
        </LoadingRegion>
      ) : notes.isError ? (
        <ErrorState description={errorMessage(notes.error)} onRetry={() => void notes.refetch()} />
      ) : notes.data.length === 0 ? (
        <Typography color="text.secondary">{t('notes.empty')}</Typography>
      ) : (
        <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {notes.data.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              editing={editing === note.id}
              onEdit={() => {
                edit.reset();
                setEditing(note.id);
              }}
              onCancel={() => {
                setEditing(null);
              }}
              onSave={async (body) => {
                await edit.mutateAsync({ noteId: note.id, body });
                setEditing(null);
              }}
              saving={edit.isPending}
              saveError={edit.error ? errorMessage(edit.error) : null}
              onDelete={() => {
                setDeleting(note);
              }}
            />
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={t('notes.delete.title')}
        description={t('notes.delete.body')}
        confirmLabel={t('notes.delete.confirm')}
        onClose={() => {
          setDeleting(null);
        }}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
          } catch (error) {
            toast.show({ message: errorMessage(error), severity: 'error' });
          } finally {
            setDeleting(null);
          }
        }}
      />
    </Stack>
  );
}

function NoteCard({
  note,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  saveError,
  onDelete,
}: {
  note: Note;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: string) => Promise<void>;
  saving: boolean;
  saveError: string | null;
  onDelete: () => void;
}) {
  const { t } = useTranslation('learning');
  const { formatDateTime } = useDateFormat();
  const [text, setText] = useState(note.body);
  const [problem, setProblem] = useState<'required' | 'tooLong' | null>(null);

  return (
    <Card component="li">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        {editing ? (
          <Stack
            component="form"
            noValidate
            spacing={1.5}
            onSubmit={(event) => {
              event.preventDefault();
              const found = bodyProblem(text);
              setProblem(found);
              if (found) return;
              void onSave(text.trim()).catch(() => undefined);
            }}
          >
            <TextField
              label={t('notes.editLabel')}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(null);
              }}
              multiline
              minRows={3}
              fullWidth
              autoFocus
              error={Boolean(problem) || Boolean(saveError)}
              helperText={
                problem === 'required'
                  ? t('notes.required')
                  : problem === 'tooLong'
                    ? t('notes.tooLong', { max: NOTE_MAX })
                    : (saveError ?? undefined)
              }
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="outlined" loading={saving}>
                {t('notes.update')}
              </Button>
              <Button
                color="inherit"
                sx={{ color: 'text.secondary' }}
                onClick={() => {
                  setText(note.body);
                  onCancel();
                }}
              >
                {t('notes.cancel')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {note.body}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {formatDateTime(note.updatedAt)}
              </Typography>
              <Button size="small" onClick={onEdit} sx={{ minHeight: 44 }}>
                {t('notes.edit')}
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={onDelete}
                sx={{ color: 'text.secondary', minHeight: 44 }}
              >
                {t('notes.delete.short')}
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
