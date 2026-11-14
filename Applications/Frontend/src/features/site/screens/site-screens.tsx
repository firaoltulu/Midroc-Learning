import { useTranslation } from 'react-i18next';
import { InfoPage } from '../components/info-page';

/**
 * When the privacy notice and the terms last changed. Update it with the text, so the pages
 * show the current version (noon UTC keeps the same calendar day in every time zone).
 */
const LEGAL_UPDATED_AT = '2026-11-14T12:00:00Z';

const ABOUT_SECTIONS = ['learn', 'teach', 'languages'] as const;
const HELP_SECTIONS = ['signIn', 'learning', 'exams', 'authoring', 'settings', 'contact'] as const;
const PRIVACY_SECTIONS = [
  'collect',
  'use',
  'visibility',
  'providers',
  'device',
  'choices',
] as const;
const TERMS_SECTIONS = ['account', 'content', 'review', 'conduct', 'service'] as const;

export function AboutScreen() {
  const { t } = useTranslation('site');
  return (
    <InfoPage
      title={t('about.title')}
      intro={t('about.intro')}
      sections={ABOUT_SECTIONS.map((id) => ({
        id,
        heading: t(`about.sections.${id}.heading`),
        body: t(`about.sections.${id}.body`),
      }))}
    />
  );
}

export function HelpScreen() {
  const { t } = useTranslation('site');
  return (
    <InfoPage
      title={t('help.title')}
      intro={t('help.intro')}
      sections={HELP_SECTIONS.map((id) => ({
        id,
        heading: t(`help.sections.${id}.heading`),
        body: t(`help.sections.${id}.body`),
      }))}
    />
  );
}

export function PrivacyScreen() {
  const { t } = useTranslation('site');
  return (
    <InfoPage
      title={t('privacy.title')}
      intro={t('privacy.intro')}
      updatedAt={LEGAL_UPDATED_AT}
      sections={PRIVACY_SECTIONS.map((id) => ({
        id,
        heading: t(`privacy.sections.${id}.heading`),
        body: t(`privacy.sections.${id}.body`),
      }))}
    />
  );
}

export function TermsScreen() {
  const { t } = useTranslation('site');
  return (
    <InfoPage
      title={t('terms.title')}
      intro={t('terms.intro')}
      updatedAt={LEGAL_UPDATED_AT}
      sections={TERMS_SECTIONS.map((id) => ({
        id,
        heading: t(`terms.sections.${id}.heading`),
        body: t(`terms.sections.${id}.body`),
      }))}
    />
  );
}
