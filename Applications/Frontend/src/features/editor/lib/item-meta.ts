import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../shared/i18n/format-number';
import type { AuthoringItem } from '../api/schemas';
import type { WorkingItem } from '../model/working-copy';

/** What an item row says on the right: the shape of either editor's items. */
interface MetaSource {
  type: 'video' | 'pdf' | 'exam';
  video: { verified: boolean; unavailable: boolean; pendingLink: boolean } | null;
  pdf: { attached: boolean; pageCount: number | null; sizeBytes: number | null } | null;
  exam: { questionCount: number; passingScorePercent: number | null } | null;
}

export const fromAuthoringItem = (item: AuthoringItem): MetaSource => ({
  type: item.type,
  video:
    item.type === 'video'
      ? {
          verified: Boolean(item.youtubeVideoId),
          unavailable: item.isAvailable === false,
          pendingLink: false,
        }
      : null,
  pdf:
    item.type === 'pdf'
      ? { attached: Boolean(item.fileKey), pageCount: item.pageCount, sizeBytes: item.sizeBytes }
      : null,
  exam:
    item.type === 'exam'
      ? {
          questionCount: (item.questions ?? []).length,
          passingScorePercent: item.passingScorePercent,
        }
      : null,
});

export const fromWorkingItem = (item: WorkingItem): MetaSource => ({
  type: item.type,
  video: item.video
    ? {
        verified: Boolean(item.video.youtubeVideoId) && !item.video.url,
        unavailable: false,
        pendingLink: Boolean(item.video.url),
      }
    : null,
  pdf: item.pdf
    ? {
        attached: Boolean(item.pdf.fileKey),
        pageCount: item.pdf.pageCount,
        sizeBytes: item.pdf.sizeBytes,
      }
    : null,
  exam: item.exam
    ? {
        questionCount: item.exam.questions.length,
        passingScorePercent: Number(item.exam.passingScorePercent) || null,
      }
    : null,
});

/** "Verified", "12 pages · 1.4 MB", "5 questions · pass 60%". */
export function useItemMeta() {
  const { t } = useTranslation('editor');
  const { formatDecimal } = useNumberFormat();
  return (source: MetaSource): string | null => {
    if (source.type === 'video' && source.video) {
      if (source.video.unavailable) return t('content.meta.videoUnavailable');
      if (source.video.pendingLink) return t('content.meta.videoPending');
      return source.video.verified ? t('content.meta.verified') : t('content.meta.noVideo');
    }
    if (source.type === 'pdf' && source.pdf) {
      if (!source.pdf.attached) return t('content.meta.noFile');
      const parts = [
        source.pdf.pageCount !== null
          ? t('content.meta.pages', { count: source.pdf.pageCount })
          : null,
        source.pdf.sizeBytes !== null
          ? t('content.meta.megabytes', {
              size: formatDecimal(Math.max(0.1, source.pdf.sizeBytes / 1_000_000)),
            })
          : null,
      ].filter((part): part is string => Boolean(part));
      return parts.length ? parts.join(' · ') : t('content.meta.fileAttached');
    }
    if (source.type === 'exam' && source.exam) {
      const questions = t('content.meta.questions', { count: source.exam.questionCount });
      return source.exam.passingScorePercent !== null
        ? `${questions} · ${t('content.meta.pass', { percent: source.exam.passingScorePercent })}`
        : questions;
    }
    return null;
  };
}
