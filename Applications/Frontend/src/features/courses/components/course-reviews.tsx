import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import StarOutlined from '@mui/icons-material/StarOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useNumberFormat } from '../../../shared/i18n/format-number';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../shared/ui/error-state';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { useToast } from '../../../shared/ui/toast/toast-context';
import {
  reviewsQueryOptions,
  useDeleteReview,
  useRemoveReview,
  useSaveReview,
  type Review,
} from '../api/reviews';
import type { CourseDetail } from '../api/schemas';
import { formatRating } from '../lib/course-text';
import { RatingStars } from './rating-stars';

const STARS = ['5', '4', '3', '2', '1'] as const;
/** A whole number of stars from 1 to 5, else null. */
const starValue = (value: number | null) =>
  value !== null && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;

/** The backend's limit (ReviewInput.comment). */
const REVIEW_COMMENT_MAX = 2000;

/**
 * Learner reviews: the average with stars and the count, how many ratings gave each number of
 * stars, the viewer's own rating (enrolled learners), and the reviews, a page at a time.
 */
export function CourseReviews({
  course,
  canReview,
  canModerate = false,
}: {
  course: CourseDetail;
  canReview: boolean;
  /** Administrators: remove reviews that break the terms of use. */
  canModerate?: boolean;
}) {
  const { t } = useTranslation('courses');

  return (
    <Stack component="section" aria-labelledby="course-reviews-heading" spacing={3}>
      <Typography id="course-reviews-heading" variant="h3" component="h2">
        {t('reviews.title')}
      </Typography>
      {course.ratingCount > 0 ? <RatingSummary course={course} /> : null}
      {canReview ? <MyReview course={course} /> : null}
      <ReviewList course={course} canModerate={canModerate} />
    </Stack>
  );
}

function RatingSummary({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('courses');
  const { formatNumber } = useNumberFormat();
  const average = course.ratingAverage ?? 0;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 5 }}>
      <Stack spacing={0.5} sx={{ flexShrink: 0 }}>
        <Typography sx={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>
          {formatRating(average)}
        </Typography>
        <RatingStars value={average} />
        <Typography variant="body2" color="text.secondary">
          {t('reviews.count', {
            count: course.ratingCount,
            formatted: formatNumber(course.ratingCount),
          })}
        </Typography>
      </Stack>
      <Stack
        component="ul"
        aria-label={t('reviews.distribution')}
        spacing={1}
        sx={{ listStyle: 'none', m: 0, p: 0, flex: 1, justifyContent: 'center', maxWidth: 520 }}
      >
        {STARS.map((stars) => {
          const count = course.ratingDistribution[stars];
          const percent = course.ratingCount ? Math.round((count / course.ratingCount) * 100) : 0;
          const label = t('reviews.starsCount', { stars, count });
          return (
            <Stack
              key={stars}
              component="li"
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Typography variant="body2" color="text.secondary" aria-hidden sx={{ width: 12 }}>
                {stars}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percent}
                aria-label={label}
                aria-valuetext={label}
                sx={{ flex: 1, height: 8 }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}

/** The viewer's own rating and comment: add, change or delete it. */
function MyReview({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('courses');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const save = useSaveReview(course.id);
  const remove = useDeleteReview(course.id);
  const mine = course.myReview;
  const [rating, setRating] = useState<number | null>(mine?.rating ?? null);
  const [comment, setComment] = useState(mine?.comment ?? '');
  const [missingRating, setMissingRating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const labelId = useId();
  const errorId = useId();
  const tooLong = comment.length > REVIEW_COMMENT_MAX;
  const failure = save.error ?? remove.error;

  return (
    <Card component="section" aria-labelledby={`${labelId}-title`}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack
          component="form"
          noValidate
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            if (rating === null) {
              setMissingRating(true);
              return;
            }
            if (tooLong) return;
            remove.reset();
            save.mutate(
              { rating, comment: comment.trim() },
              {
                onSuccess: () => {
                  toast.show({ message: t('reviews.form.saved'), severity: 'success' });
                },
              },
            );
          }}
        >
          <Typography id={`${labelId}-title`} variant="h4" component="h3">
            {mine ? t('reviews.form.editTitle') : t('reviews.form.title')}
          </Typography>
          <FormControl error={missingRating} component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
            <FormLabel component="legend" id={labelId} sx={{ color: 'text.primary', mb: 0.5 }}>
              {t('reviews.form.rating')}
            </FormLabel>
            <Rating
              name={`rating-${course.id}`}
              value={rating}
              size="large"
              getLabelText={(value) => t('reviews.form.stars', { count: value })}
              icon={<StarOutlined fontSize="inherit" />}
              emptyIcon={<StarBorderOutlined fontSize="inherit" />}
              onChange={(event, value) => {
                // The clicked star's own value (MUI's hover-based value can be NaN when the
                // layout has no size, e.g. in tests). Clicking the chosen star again keeps it.
                const star = Number((event.target as HTMLInputElement).value);
                setRating(starValue(star) ?? starValue(value));
                setMissingRating(false);
              }}
              aria-describedby={missingRating ? errorId : undefined}
              sx={{
                color: 'rating.main',
                '& .MuiRating-iconEmpty': { color: 'text.secondary' },
                // 44px touch targets.
                '& .MuiRating-label, & .MuiRating-icon': { minWidth: 44, minHeight: 44 },
                '& .MuiRating-icon': { justifyContent: 'center', alignItems: 'center' },
              }}
            />
            {missingRating ? (
              <FormHelperText id={errorId} sx={{ mx: 0 }}>
                {t('reviews.form.ratingRequired')}
              </FormHelperText>
            ) : null}
          </FormControl>
          <TextField
            label={t('reviews.form.comment')}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            multiline
            minRows={3}
            error={tooLong}
            helperText={
              tooLong
                ? t('reviews.form.commentTooLong', { max: REVIEW_COMMENT_MAX })
                : t('reviews.form.commentHint')
            }
          />
          {failure ? (
            <Alert severity="error" variant="outlined">
              {errorMessage(failure)}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button type="submit" variant="outlined" loading={save.isPending}>
              {mine ? t('reviews.form.update') : t('reviews.form.submit')}
            </Button>
            {mine ? (
              <Button
                color="inherit"
                sx={{ color: 'text.secondary' }}
                onClick={() => {
                  setConfirming(true);
                }}
              >
                {t('reviews.form.delete')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <ConfirmDialog
          open={confirming}
          tone="danger"
          title={t('reviews.form.deleteTitle')}
          description={t('reviews.form.deleteBody')}
          confirmLabel={t('reviews.form.delete')}
          onClose={() => {
            setConfirming(false);
          }}
          onConfirm={async () => {
            save.reset();
            try {
              await remove.mutateAsync(undefined);
              setRating(null);
              setComment('');
              toast.show({ message: t('reviews.form.deleted'), severity: 'success' });
            } catch {
              // Shown inline above.
            } finally {
              setConfirming(false);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function ReviewList({ course, canModerate }: { course: CourseDetail; canModerate: boolean }) {
  const { t } = useTranslation('courses');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const reviews = useInfiniteQuery(reviewsQueryOptions(course.id));
  const remove = useRemoveReview();
  const [removing, setRemoving] = useState<Review | null>(null);

  if (reviews.isPending) {
    return (
      <LoadingRegion>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={88} />
        </Stack>
      </LoadingRegion>
    );
  }
  if (reviews.isError) {
    return (
      <ErrorState
        description={errorMessage(reviews.error)}
        onRetry={() => void reviews.refetch()}
      />
    );
  }
  const items = reviews.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return <Typography color="text.secondary">{t('reviews.empty')}</Typography>;
  }
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Stack
        component="ul"
        spacing={2}
        sx={{ listStyle: 'none', m: 0, p: 0, alignSelf: 'stretch' }}
      >
        {items.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onRemove={
              canModerate && !review.mine
                ? () => {
                    remove.reset();
                    setRemoving(review);
                  }
                : undefined
            }
          />
        ))}
      </Stack>
      {reviews.hasNextPage ? (
        <Button
          variant="outlined"
          loading={reviews.isFetchingNextPage}
          onClick={() => void reviews.fetchNextPage()}
        >
          {t('reviews.showMore')}
        </Button>
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title={t('reviews.remove.title')}
        description={t('reviews.remove.body')}
        confirmLabel={t('reviews.remove.confirm')}
        onClose={() => {
          setRemoving(null);
        }}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.id);
            toast.show({ message: t('reviews.remove.done'), severity: 'success' });
          } catch (error) {
            toast.show({ message: errorMessage(error), severity: 'error' });
          } finally {
            setRemoving(null);
          }
        }}
      />
    </Stack>
  );
}

function ReviewCard({ review, onRemove }: { review: Review; onRemove?: () => void }) {
  const { t } = useTranslation('courses');
  const { formatDate } = useDateFormat();
  const author = review.mine ? t('reviews.you') : (review.authorName ?? t('reviews.anonymous'));

  return (
    <Card component="li">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography sx={{ fontWeight: 600 }}>{author}</Typography>
          <RatingStars value={review.rating} />
          <Box component="span" sx={visuallyHidden}>
            {t('reviews.form.stars', { count: review.rating })}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formatDate(review.updatedAt)}
          </Typography>
          {onRemove ? (
            <Button
              size="small"
              color="error"
              onClick={onRemove}
              aria-label={t('reviews.remove.action', { author })}
              sx={{ ml: 'auto', minHeight: 44 }}
            >
              {t('reviews.remove.short')}
            </Button>
          ) : null}
        </Stack>
        {review.comment ? (
          <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {review.comment}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
