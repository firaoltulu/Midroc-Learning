import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import type { ComponentType } from 'react';
import type { ItemType } from '../api/schemas';

/** One icon per item type, used wherever items are listed. */
export const ITEM_ICONS: Record<ItemType, ComponentType> = {
  video: PlayCircleOutlined,
  pdf: PictureAsPdfOutlined,
  exam: QuizOutlined,
};
