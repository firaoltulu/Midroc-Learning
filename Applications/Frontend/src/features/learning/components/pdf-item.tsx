import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import ZoomInOutlined from '@mui/icons-material/ZoomInOutlined';
import ZoomOutOutlined from '@mui/icons-material/ZoomOutOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ErrorState } from '../../../shared/ui/error-state';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { pdfQueryOptions, useSaveProgress } from '../api/playback';
import { pdfFileName, prefersExternalPdf } from '../lib/platform';

// pdf.js parses in a worker, bundled as its own file.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const FIT_WIDTH = 2; // index of 1 (100 % = the page fills the width)

interface PdfItemProps {
  courseId: string;
  itemId: string;
  title: string;
  completed: boolean;
}

/** A PDF item: the document with paging, zoom, download and "Mark as complete". Lazy. */
export default function PdfItem({ courseId, itemId, title, completed }: PdfItemProps) {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const pdf = useQuery(pdfQueryOptions(itemId));
  const objectUrl = useObjectUrl(pdf.data);
  const save = useSaveProgress(courseId, itemId);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState<number>(FIT_WIDTH);
  const [renderFailed, setRenderFailed] = useState(false);
  const [width, measureRef] = useElementWidth();
  const completionSent = useRef(completed);
  const [external] = useState(prefersExternalPdf);

  const markComplete = () => {
    if (completionSent.current) return;
    completionSent.current = true;
    save({ completed: true });
  };

  // Viewing the last page completes the item.
  useEffect(() => {
    if (pageCount > 0 && page === pageCount) markComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount]);

  if (pdf.isPending) {
    return (
      <LoadingRegion label={t('pdf.loading')}>
        <Skeleton variant="rounded" sx={{ aspectRatio: '3 / 4', height: 'auto', maxHeight: 640 }} />
      </LoadingRegion>
    );
  }
  if (pdf.isError) {
    return <ErrorState description={errorMessage(pdf.error)} onRetry={() => void pdf.refetch()} />;
  }

  const fileName = pdfFileName(title);
  const actions = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {objectUrl ? (
        <Button
          variant="outlined"
          startIcon={<DownloadOutlined />}
          href={objectUrl}
          download={fileName}
        >
          {t('pdf.download')}
        </Button>
      ) : null}
      {objectUrl && (external || renderFailed) ? (
        <Button
          variant="outlined"
          startIcon={<OpenInNewOutlined />}
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('pdf.open')}
        </Button>
      ) : null}
      {completed ? null : (
        <Button variant="text" onClick={markComplete}>
          {t('pdf.markComplete')}
        </Button>
      )}
    </Stack>
  );

  if (renderFailed) {
    return (
      <Stack spacing={2}>
        <ErrorState title={t('pdf.renderFailed.title')} description={t('pdf.renderFailed.body')} />
        {actions}
      </Stack>
    );
  }

  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;
  return (
    <Stack spacing={2}>
      <Stack
        role="toolbar"
        aria-label={t('pdf.toolbar')}
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        <IconButton
          aria-label={t('pdf.previousPage')}
          disabled={page <= 1}
          onClick={() => {
            setPage((value) => Math.max(1, value - 1));
          }}
        >
          <ChevronLeftOutlined />
        </IconButton>
        <Typography aria-live="polite" sx={{ minWidth: 96, textAlign: 'center' }}>
          {pageCount > 0 ? t('pdf.pageOf', { page, total: pageCount }) : ''}
        </Typography>
        <IconButton
          aria-label={t('pdf.nextPage')}
          disabled={pageCount === 0 || page >= pageCount}
          onClick={() => {
            setPage((value) => Math.min(pageCount, value + 1));
          }}
        >
          <ChevronRightOutlined />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton
          aria-label={t('pdf.zoomOut')}
          disabled={zoomIndex === 0}
          onClick={() => {
            setZoomIndex((value) => Math.max(0, value - 1));
          }}
        >
          <ZoomOutOutlined />
        </IconButton>
        <Typography sx={{ minWidth: 48, textAlign: 'center' }}>
          {t('pdf.zoomLevel', { percent: Math.round(zoom * 100) })}
        </Typography>
        <IconButton
          aria-label={t('pdf.zoomIn')}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          onClick={() => {
            setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1));
          }}
        >
          <ZoomInOutlined />
        </IconButton>
      </Stack>

      <Box
        ref={measureRef}
        // Scrolls on its own (zoomed pages): reachable and named for keyboard users.
        role="region"
        tabIndex={0}
        aria-label={t('pdf.documentLabel', { title })}
        sx={{
          overflow: 'auto',
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
          maxHeight: { xs: '70vh', md: '75vh' },
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
          bgcolor: 'surfaceMuted',
          // pdf.js draws pages on white whatever the theme; keep a frame around them.
          '& .react-pdf__Page': { mx: 'auto', my: 2, boxShadow: 'none' },
          '& .react-pdf__Page__canvas': { mx: 'auto' },
        }}
      >
        <Document
          file={pdf.data}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
          }}
          onLoadError={() => {
            setRenderFailed(true);
          }}
          loading={<Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', height: 'auto' }} />}
          error=""
        >
          {width > 0 ? (
            <Page
              pageNumber={page}
              width={Math.max(240, Math.floor((width - 32) * zoom))}
              loading=""
            />
          ) : null}
        </Document>
      </Box>

      {actions}
    </Stack>
  );
}

/** An object URL for the blob, revoked when it changes or the item closes. */
function useObjectUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    // The URL is a resource owned by this effect (created here, revoked in its cleanup), so it
    // can't be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [blob]);
  return url;
}

/** The element's content width, kept up to date (for fit-to-width pages). */
function useElementWidth(): [number, (element: HTMLElement | null) => void] {
  const [width, setWidth] = useState(0);
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;
    // Also reports the initial size.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return [width, setElement];
}
