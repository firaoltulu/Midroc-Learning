import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../../shared/ui/form-text-field';
import { itemTypeSchema } from '../../../courses';
import type { PdfUpload } from '../../api/schemas';
import { titleProblem } from '../../model/limits';
import { megabytes } from '../../model/pdf-file';
import { useWorkingCopy } from '../../model/working-copy-store';
import { PdfDropzone } from '../pdf-dropzone';

type ItemType = 'video' | 'pdf' | 'exam';

/** A new module in the working copy (sent with the changes for review). */
export function WorkingAddModuleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation(['editor', 'common']);
  const addModule = useWorkingCopy((state) => state.addModule);
  const select = useWorkingCopy((state) => state.select);
  const titleId = useId();
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const close = () => {
    setTitle('');
    setProblem(null);
    onClose();
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const found = titleProblem(title);
    setProblem(found);
    if (found) return;
    const key = addModule(title.trim());
    close();
    select({ kind: 'module', key });
  };

  return (
    <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>{t('addModule.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <DialogContentText>{t('working.addHint')}</DialogContentText>
            <FormTextField
              label={t('module.title')}
              value={title}
              autoFocus
              required
              onChange={(event) => {
                setTitle(event.target.value);
                setProblem(null);
              }}
              errorKey={problem ?? undefined}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close}>{t('common:actions.cancel')}</Button>
          <Button type="submit" variant="contained">
            {t('addModule.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * A new item in the working copy: a video link (checked by the server when the changes are
 * submitted), a PDF (uploaded now, attached on submit) or an empty exam.
 */
export function WorkingAddItemDialog({
  moduleKey,
  moduleTitle,
  open,
  onClose,
}: {
  moduleKey: string;
  moduleTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation(['editor', 'courses', 'common']);
  const addItem = useWorkingCopy((state) => state.addItem);
  const select = useWorkingCopy((state) => state.select);
  const titleId = useId();
  const [type, setType] = useState<ItemType>('video');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pdf, setPdf] = useState<{ upload: PdfUpload; name: string } | null>(null);
  const [problems, setProblems] = useState<{ title?: string; url?: string; pdf?: string }>({});

  const close = () => {
    setType('video');
    setTitle('');
    setUrl('');
    setPdf(null);
    setProblems({});
    onClose();
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const found = {
      title: titleProblem(title) ?? undefined,
      url: type === 'video' && !url.trim() ? 'validation:VIDEO_LINK_REQUIRED.default' : undefined,
      pdf: type === 'pdf' && !pdf ? 'editor:addItem.pdfRequired' : undefined,
    };
    setProblems(found);
    if (found.title ?? found.url ?? found.pdf) return;
    const base = { type, title: title.trim() };
    const key = addItem(
      moduleKey,
      type === 'video'
        ? { ...base, video: { youtubeVideoId: null, youtubeTitle: null, url: url.trim() } }
        : type === 'pdf' && pdf
          ? {
              ...base,
              pdf: {
                fileKey: pdf.upload.fileKey,
                sizeBytes: pdf.upload.sizeBytes,
                pageCount: pdf.upload.pageCount,
              },
            }
          : {
              ...base,
              exam: {
                instructions: '',
                passingScorePercent: '60',
                maxAttempts: '',
                timeLimitMinutes: '',
                questions: [],
              },
            },
    );
    close();
    select({ kind: 'item', key });
  };

  return (
    <Dialog open={open} onClose={close} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>{t('addItem.title', { module: moduleTitle })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <DialogContentText>{t('working.addHint')}</DialogContentText>
            <RadioGroup
              row
              aria-label={t('addItem.type')}
              value={type}
              onChange={(event) => {
                const next = event.target.value;
                setType(next === 'pdf' || next === 'exam' ? next : 'video');
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
                hint={t('working.linkCheckedOnSubmit')}
                value={url}
                type="url"
                required
                onChange={(event) => {
                  setUrl(event.target.value);
                  setProblems((current) => ({ ...current, url: undefined }));
                }}
                errorKey={problems.url}
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={close}>{t('common:actions.cancel')}</Button>
          <Button type="submit" variant="contained">
            {t('addItem.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
