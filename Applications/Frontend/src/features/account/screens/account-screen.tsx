import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { PageHeader } from '../../../shared/ui/page-header';
import { TextSkeleton } from '../../../shared/ui/skeletons';
import { useMe, useSignOut } from '../../auth';

/**
 * Account page (stub). Phase 11 adds language, theme and date-format settings here.
 */
export function AccountScreen() {
  const { t } = useTranslation('account');
  const { data: me } = useMe();
  const signOut = useSignOut();
  const { formatDate } = useDateFormat();

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outlined" startIcon={<LogoutOutlined />} onClick={() => void signOut()}>
            {t('signOut')}
          </Button>
        }
      />
      <Card sx={{ maxWidth: 720 }}>
        <CardContent>
          {me ? (
            <Box
              component="dl"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, auto) 1fr' },
                columnGap: 3,
                rowGap: { xs: 0.5, sm: 2 },
                m: 0,
              }}
            >
              {(
                [
                  [t('fields.name'), me.name ?? t('noName')],
                  [t('fields.email'), me.email],
                  [t('fields.role'), t(`roles.${me.role}`)],
                  [t('fields.memberSince'), formatDate(me.createdAt)],
                ] as const
              ).map(([label, value]) => (
                <Fragment key={label}>
                  <Typography component="dt" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography
                    component="dd"
                    sx={{ m: 0, mb: { xs: 2, sm: 0 }, overflowWrap: 'anywhere' }}
                  >
                    {value}
                  </Typography>
                </Fragment>
              ))}
            </Box>
          ) : (
            <TextSkeleton lines={4} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
