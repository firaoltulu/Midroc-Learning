import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { itemTypeSchema } from '../../courses';
import { useAddItem, useAddModule } from '../api/authoring';
import type { ItemCreate, PdfUpload } from '../api/schemas';
import { useSaveErrorText } from '../lib/save-error';
import { titleProblem } from '../model/limits';
import { megabytes } from '../model/pdf-file';
import { useSaveTracker } from '../model/save-tracker';
import { PdfDropzone } from './pdf-dropzone';

type ItemType = ItemCreate['type'];

const VIDEO_CODES = ['VIDEO_INVALID_LINK', 'VIDEO_UNAVAILABLE', 'YOUTUBE_UNREACHABLE'];

/** Title for a new module; created at the end of the list. */
export function AddModuleDialog({
  courseId,
  open,
  onClose,
  onAdded,
}: {
  courseId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (moduleId: string) => void;
}) {
  const { t } = useTranslation(['editor', 'common']);
  const add = useAddModule(courseId);
  const tracker = useSaveTracker();
  const saveErrorText = useSaveErrorText();
  const titleId = useId();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const close = () => {
    setTitle('');
    setProblem(null);
    setError(null);
    onClose();
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const found = titleProblem(title);
    setProblem(found);
    if (found) return;
    try {
      const module = await tracker.run(
        'structure',
        () => add.mutateAsync({ title: title.trim() }),
        {
          reportFailure: false,
        },
      );
      close();
      onAdded(module.id);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={add.isPending ? undefined : close}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <DialogTitle id={titleId}>{t('addModule.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormTextField
              label={t('module.title')}
              value={title}
              autoFocus
              required
              onChange={(event) => {
                setTitle(event.target.value);
                setProblem(null);
              }}
              errorKey={problem ?? saveErrorText(error) ?? undefined}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close} disabled={add.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="contained" loading={add.isPending}>
            {t('addModule.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * A new item at the end of a module: choose the type, give it a title and, for a video, the
 * YouTube link (verified by the server) or, for a PDF, the file (uploaded first, with
 * progress). Exams start empty; questions are added in the exam editor.
 */
export function AddItemDialog({
  courseId,
  moduleId,
  moduleTitle,
  initialType = 'video',
  open,
  onClose,
  onAdded,
}: {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  /** The type chosen when the dialog opens ("+ Video", "+ PDF", "+ Exam"). */
  initialType?: ItemType;
  open: boolean;
  onClose: () => void;
  onAdded: (itemId: string) => void;
}) {
  const { t } = useTranslation(['editor', 'courses', 'common']);
  const add = useAddItem(courseId);
  const tracker = useSaveTracker();
  const saveErrorText = useSaveErrorText();
  const titleId = useId();
  const [type, setType] = useState<ItemType>(initialType);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pdf, setPdf] = useState<{ upload: PdfUpload; name: string } | null>(null);
  const [problems, setProblems] = useState<{ title?: string; url?: string; pdf?: string }>({});
  const [error, setError] = useState<unknown>(null);

  const close = () => {
    setType(initialType);
    setTitle('');
    setUrl('');
    setPdf(null);
    setProblems({});
    setError(null);
    onClose();
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    const found = {
      title: titleProblem(title) ?? undefined,
      url: type === 'video' && !url.trim() ? 'validation:VIDEO_LINK_REQUIRED.default' : undefined,
      pdf: type === 'pdf' && !pdf ? 'editor:addItem.pdfRequired' : undefined,
    };
    setProblems(found);
    setError(null);
    if (found.title ?? found.url ?? found.pdf) return;
    const item: ItemCreate =
      type === 'video'
        ? { type, title: title.trim(), url: url.trim() }
        : type === 'pdf' && pdf
          ? { type, title: title.trim(), fileKey: pdf.upload.fileKey }
          : { type: 'exam', title: title.trim() };
    try {
      const created = await tracker.run('structure', () => add.mutateAsync({ moduleId, item }), {
        reportFailure: false,
      });
      close();
      onAdded(created.id);
    } catch (caught) {
      setError(caught);
    }
  };

  const videoError = VIDEO_CODES.some((code) => isApiError(error, code));

  return (
    <Dialog
      open={open}
      onClose={add.isPending ? undefined : close}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <DialogTitle id={titleId}>{t('addItem.title', { module: moduleTitle })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <RadioGroup
              row
              aria-label={t('addItem.type')}
              value={type}
              onChange={(event) => {
                const next = event.target.value;
                setType(next === 'pdf' || next === 'exam' ? next : 'video');
                setError(null);
              }}
            >
              {itemTypeSchema.options.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={t(`courses:itemType.${option}`)}
                />
              ))}
            </RadioGroup>
            <FormTextField
              label={t('item.title')}
              value={title}
              required
              onChange={(event) => {
                setTitle(event.target.value);
                setProblems((current) => ({ ...current, title: undefined }));
              }}
              errorKey={problems.title}
            />
            {type === 'video' ? (
              <FormTextField
                label={t('addItem.videoLink')}
                hint={t('video.linkHint')}
                value={url}
                type="url"
                required
                onChange={(event) => {
                  setUrl(event.target.value);
                  setProblems((current) => ({ ...current, url: undefined }));
                  setError(null);
                }}
                errorKey={
                  problems.url ?? (videoError ? (saveErrorText(error) ?? undefined) : undefined)
                }
              />
            ) : null}
            {type === 'pdf' ? (
              <Stack spacing={1}>
                {pdf ? (
                  <Typography>
                    {t('addItem.pdfReady', {
                      name: pdf.name,
                      count: pdf.upload.pageCount,
                      size: megabytes(pdf.upload.sizeBytes),
                    })}
                  </Typography>
                ) : null}
                <PdfDropzone
                  label={pdf ? t('pdf.replace') : t('pdf.choose')}
                  onUploaded={(upload, file) => {
                    setPdf({ upload, name: file.name });
                    setProblems((current) => ({ ...current, pdf: undefined }));
                  }}
                />
                {problems.pdf ? (
                  <Typography variant="body2" color="error">
                    {t('addItem.pdfRequired')}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
            {type === 'exam' ? (
              <Typography variant="body2" color="text.secondary">
                {t('addItem.examHint')}
              </Typography>
            ) : null}
            {error && !videoError ? (
              <Typography variant="body2" color="error" role="alert">
                {saveErrorText(error)}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close} disabled={add.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="contained" loading={add.isPending}>
            {t('addItem.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
