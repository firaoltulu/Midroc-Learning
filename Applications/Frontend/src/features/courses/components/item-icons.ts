import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import OndemandVideoOutlined from '@mui/icons-material/OndemandVideoOutlined';
import type { ComponentType } from 'react';
import type { ItemType } from '../api/schemas';

/** One icon per item type, used wherever items are listed. */
export const ITEM_ICONS: Record<ItemType, ComponentType> = {
  video: OndemandVideoOutlined,
  pdf: PictureAsPdfOutlined,
  exam: FactCheckOutlined,
};
