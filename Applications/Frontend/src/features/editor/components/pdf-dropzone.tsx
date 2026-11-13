import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { uploadPdf } from '../api/authoring';
import type { PdfUpload } from '../api/schemas';
import { checkPdfFile, PDF_MAX_MEGABYTES } from '../model/pdf-file';

/**
 * Drag-and-drop or pick a PDF; checked on the client (type, size), then uploaded with a
 * progress bar and a cancel button. `onUploaded` gets the server's fileKey.
 */
export function PdfDropzone({
  onUploaded,
  disabled = false,
  label,
}: {
  onUploaded: (upload: PdfUpload, file: File) => void | Promise<void>;
  disabled?: boolean;
  /** Button text, e.g. "Choose a PDF" or "Replace file". */
  label: string;
}) {
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const start = async (file: File | undefined) => {
    if (!file || disabled || progress !== null) return;
    const problem = checkPdfFile(file);
    if (problem) {
      setError(
        problem === 'type'
          ? t('pdf.errors.type')
          : t('pdf.errors.size', { max: PDF_MAX_MEGABYTES }),
      );
      return;
    }
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const upload = await uploadPdf(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      setProgress(1);
      await onUploaded(upload, file);
    } catch (caught) {
      if (!controller.signal.aborted) setError(errorMessage(caught));
    } finally {
      abort.current = null;
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void start(event.dataTransfer.files[0]);
  };

  const percent = progress === null ? 0 : Math.round(progress * 100);

  return (
    <Stack spacing={1}>
      <Box
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={onDrop}
        data-testid="pdf-dropzone"
        sx={{
          p: 3,
          border: '1px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          borderRadius: '10px',
          bgcolor: dragging ? 'action.hover' : 'transparent',
          textAlign: 'center',
        }}
      >
        {progress === null ? (
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <UploadFileOutlined aria-hidden sx={{ color: 'text.secondary' }} />
            <input
              ref={inputRef}
              type="file"
              aria-label={label}
              accept="application/pdf,.pdf"
              hidden
              disabled={disabled}
              onChange={(event) => void start(event.target.files?.[0])}
            />
            <Button
              variant="outlined"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {label}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {t('pdf.dropHint', { max: PDF_MAX_MEGABYTES })}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2" aria-live="polite">
              {t('pdf.uploading', { percent })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={percent}
              aria-label={t('pdf.progressLabel')}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Button
              size="small"
              onClick={() => abort.current?.abort()}
              sx={{ alignSelf: 'center' }}
            >
              {t('pdf.cancel')}
            </Button>
          </Stack>
        )}
      </Box>
      {error ? (
        <Typography variant="body2" color="error" role="alert">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
