import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useId, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../shared/ui/error-state';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { useToast } from '../../../shared/ui/toast/toast-context';
import {
  repliesQueryOptions,
  threadsQueryOptions,
  useDeletePost,
  useReply,
  useStartThread,
  type Post,
  type Thread,
} from '../api/discussions';

/** The backend's limit (PostInput.body). */
const POST_MAX = 4000;

/**
 * Discussions on the item: ask a question (or share something), threads newest first with
 * their replies on demand. `canModerate`: the course owner and administrators may delete
 * anyone's post; everyone may delete their own.
 */
export function DiscussionsPanel({
  itemId,
  canPost,
  canModerate,
}: {
  itemId: string;
  /** False on a course that isn't published (posting is closed). */
  canPost: boolean;
  canModerate: boolean;
}) {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const threads = useInfiniteQuery(threadsQueryOptions(itemId));
  const start = useStartThread(itemId);
  const remove = useDeletePost(itemId);
  const [deleting, setDeleting] = useState<Post | null>(null);

  return (
    <Stack spacing={3}>
      {canPost ? (
        <PostForm
          label={t('discussions.askLabel')}
          placeholder={t('discussions.askPlaceholder')}
          submitLabel={t('discussions.post')}
          pending={start.isPending}
          error={start.error ? errorMessage(start.error) : null}
          onSubmit={async (body) => {
            await start.mutateAsync(body);
          }}
        />
      ) : null}

      {threads.isPending ? (
        <LoadingRegion>
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={96} />
            <Skeleton variant="rounded" height={96} />
          </Stack>
        </LoadingRegion>
      ) : threads.isError ? (
        <ErrorState
          description={errorMessage(threads.error)}
          onRetry={() => void threads.refetch()}
        />
      ) : threads.data.pages[0]?.total === 0 ? (
        <Typography color="text.secondary">{t('discussions.empty')}</Typography>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Stack
            component="ul"
            spacing={2}
            sx={{ listStyle: 'none', m: 0, p: 0, alignSelf: 'stretch' }}
          >
            {threads.data.pages
              .flatMap((page) => page.items)
              .map((thread) => (
                <ThreadCard
                  key={thread.id}
                  itemId={itemId}
                  thread={thread}
                  canPost={canPost}
                  canDelete={(post) => post.mine || canModerate}
                  onDelete={setDeleting}
                />
              ))}
          </Stack>
          {threads.hasNextPage ? (
            <Button
              variant="outlined"
              loading={threads.isFetchingNextPage}
              onClick={() => void threads.fetchNextPage()}
            >
              {t('discussions.showMore')}
            </Button>
          ) : null}
        </Stack>
      )}

      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={t('discussions.delete.title')}
        description={t('discussions.delete.body')}
        confirmLabel={t('discussions.delete.confirm')}
        onClose={() => {
          setDeleting(null);
        }}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.show({ message: t('discussions.delete.done'), severity: 'success' });
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

function ThreadCard({
  itemId,
  thread,
  canPost,
  canDelete,
  onDelete,
}: {
  itemId: string;
  thread: Thread;
  canPost: boolean;
  canDelete: (post: Post) => boolean;
  onDelete: (post: Post) => void;
}) {
  const { t } = useTranslation('learning');
  const [open, setOpen] = useState(false);
  const repliesId = useId();

  return (
    <Card component="li">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <PostView post={thread} canDelete={canDelete(thread)} onDelete={onDelete} />
        <Button
          size="small"
          aria-expanded={open}
          aria-controls={open ? repliesId : undefined}
          onClick={() => {
            setOpen((value) => !value);
          }}
          sx={{ mt: 1, ml: -1, fontWeight: 600 }}
        >
          {open
            ? t('discussions.hideReplies')
            : thread.replyCount > 0
              ? t('discussions.replies', { count: thread.replyCount })
              : t('discussions.reply')}
        </Button>
        {open ? (
          <Box
            id={repliesId}
            sx={{ mt: 1.5, pl: { xs: 1.5, sm: 3 }, borderLeft: 2, borderColor: 'divider' }}
          >
            <Replies
              itemId={itemId}
              thread={thread}
              canPost={canPost}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Replies({
  itemId,
  thread,
  canPost,
  canDelete,
  onDelete,
}: {
  itemId: string;
  thread: Thread;
  canPost: boolean;
  canDelete: (post: Post) => boolean;
  onDelete: (post: Post) => void;
}) {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const replies = useQuery(repliesQueryOptions(thread.id));
  const reply = useReply(itemId, thread.id);

  return (
    <Stack spacing={2}>
      {replies.isPending ? (
        <LoadingRegion>
          <Skeleton variant="rounded" height={56} />
        </LoadingRegion>
      ) : replies.isError ? (
        <ErrorState
          description={errorMessage(replies.error)}
          onRetry={() => void replies.refetch()}
        />
      ) : replies.data.length ? (
        <Stack component="ul" spacing={2} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {replies.data.map((post) => (
            <li key={post.id}>
              <PostView post={post} canDelete={canDelete(post)} onDelete={onDelete} />
            </li>
          ))}
        </Stack>
      ) : null}
      {canPost ? (
        <PostForm
          label={t('discussions.replyLabel')}
          submitLabel={t('discussions.postReply')}
          pending={reply.isPending}
          error={reply.error ? errorMessage(reply.error) : null}
          dense
          onSubmit={async (body) => {
            await reply.mutateAsync(body);
          }}
        />
      ) : null}
    </Stack>
  );
}

function PostView({
  post,
  canDelete,
  onDelete,
}: {
  post: Post;
  canDelete: boolean;
  onDelete: (post: Post) => void;
}) {
  const { t } = useTranslation('learning');
  const { formatRelative, formatDateTime } = useDateFormat();
  const author = post.mine ? t('discussions.you') : (post.authorName ?? t('discussions.anonymous'));

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700 }}>{author}</Typography>
        {post.byInstructor ? (
          <Chip
            size="small"
            label={t('discussions.instructor')}
            sx={{ bgcolor: 'status.published.bg', color: 'status.published.fg', height: 22 }}
          />
        ) : null}
        <Typography
          variant="body2"
          color="text.secondary"
          component="time"
          dateTime={post.createdAt}
          title={formatDateTime(post.createdAt)}
        >
          {formatRelative(post.createdAt)}
        </Typography>
        {canDelete ? (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              onDelete(post);
            }}
            aria-label={t('discussions.delete.action', { author })}
            sx={{ ml: 'auto', color: 'text.secondary', minHeight: 44 }}
          >
            {t('discussions.delete.short')}
          </Button>
        ) : null}
      </Stack>
      <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.body}</Typography>
    </Stack>
  );
}

/** A text box and a button: clears itself after a successful post. */
function PostForm({
  label,
  placeholder,
  submitLabel,
  pending,
  error,
  dense = false,
  onSubmit,
}: {
  label: string;
  placeholder?: string;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  dense?: boolean;
  onSubmit: (body: string) => Promise<void>;
}) {
  const { t } = useTranslation('learning');
  const [text, setText] = useState('');
  const [empty, setEmpty] = useState(false);
  const tooLong = text.length > POST_MAX;
  const problem = empty
    ? t('discussions.required')
    : tooLong
      ? t('discussions.tooLong', { max: POST_MAX })
      : (error ?? undefined);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setEmpty(true);
      return;
    }
    if (tooLong) return;
    try {
      await onSubmit(text.trim());
      setText('');
    } catch {
      // Shown under the box.
    }
  };

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={(event) => void submit(event)}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'flex-start' } }}
    >
      <TextField
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setEmpty(false);
        }}
        multiline
        minRows={dense ? 1 : 2}
        size={dense ? 'small' : 'medium'}
        fullWidth
        error={Boolean(problem)}
        helperText={problem}
      />
      <Button
        type="submit"
        variant={dense ? 'outlined' : 'contained'}
        loading={pending}
        sx={{ flexShrink: 0, minHeight: dense ? 40 : 56, px: 3 }}
      >
        {submitLabel}
      </Button>
    </Stack>
  );
}
