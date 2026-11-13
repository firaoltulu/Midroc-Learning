import { zodResolver } from '@hookform/resolvers/zod';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useNavigate } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useApplyApiIssues } from '../../../shared/i18n/form-errors';
import { useLanguage } from '../../../shared/i18n/use-language';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink } from '../../../shared/ui/router-links';
import { useCreateCourse } from '../api/my-courses';
import { newCourseSchema, type NewCourseValues } from '../schemas/new-course';

/**
 * /my-courses/new: a title and the course language are enough to start; everything else is
 * filled in the editor, which opens next.
 */
export function NewCourseScreen() {
  const { t } = useTranslation(['myCourses', 'common']);
  const errorMessage = useErrorMessage();
  const applyIssues = useApplyApiIssues<NewCourseValues>();
  const language = useLanguage();
  const navigate = useNavigate();
  const create = useCreateCourse();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NewCourseValues>({
    resolver: zodResolver(newCourseSchema),
    defaultValues: { title: '', language },
  });

  const onSubmit = handleSubmit((values) => {
    create.mutate(
      { title: values.title.trim(), language: values.language },
      {
        onSuccess: (course) => {
          void navigate({
            to: '/my-courses/$courseId/edit',
            params: { courseId: course.id },
            search: { tab: 'details' },
          });
        },
        onError: (error) => {
          applyIssues(error, setError, { fields: ['title', 'language'] });
        },
      },
    );
  });

  // Field problems are shown on the fields; anything else above the form.
  const formError =
    create.error && !(isApiError(create.error) && create.error.issues.length > 0)
      ? errorMessage(create.error)
      : null;

  return (
    <Stack spacing={1}>
      <ButtonLink
        to="/my-courses"
        startIcon={<ArrowBackOutlined />}
        sx={{ alignSelf: 'flex-start', ml: -1 }}
      >
        {t('backToList')}
      </ButtonLink>
      <PageHeader title={t('new.title')} description={t('new.description')} />
      <Card sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
        <Stack component="form" spacing={3} noValidate onSubmit={(event) => void onSubmit(event)}>
          {formError ? (
            <Alert severity="error" variant="outlined">
              {formError}
            </Alert>
          ) : null}
          <FormTextField
            {...register('title')}
            label={t('new.courseTitle')}
            hint={t('new.courseTitleHint')}
            required
            autoFocus
            errorKey={errors.title?.message}
          />
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <FormTextField
                {...field}
                select
                label={t('new.language')}
                hint={t('new.languageHint')}
                errorKey={errors.language?.message}
              >
                <MenuItem value="en">{t('common:languages.en')}</MenuItem>
                <MenuItem value="am" lang="am">
                  {t('common:languages.am')}
                </MenuItem>
              </FormTextField>
            )}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            loading={create.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('new.submit')}
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
