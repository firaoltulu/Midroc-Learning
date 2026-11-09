import am from '../../locales/am/common.json';
import en from '../../locales/en/common.json';

export type Messages = { [Key in keyof typeof en]: string };

export const messages: Record<'en' | 'am', Messages> = { en, am };
export type Language = keyof typeof messages;
