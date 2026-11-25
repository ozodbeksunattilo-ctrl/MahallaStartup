import type { ImageSource } from 'expo-image';

/**
 * Toifa rasmlari: muammoning o'z surati bo'lmasa kartada va muammo sahifasida shu rasm chiqadi.
 * Manba — Wikimedia Commons (CC0 / public domain) va dizayn maketi; ro'yxat `assets/images/categories/SOURCES.md` da.
 */
export const CATEGORY_IMAGE: Record<string, ImageSource> = {
  ROAD: require('../../assets/images/categories/road.webp'),
  LIGHTING: require('../../assets/images/categories/lighting.webp'),
  WASTE: require('../../assets/images/categories/waste.webp'),
  WATER: require('../../assets/images/categories/water.webp'),
  LANDSCAPING: require('../../assets/images/categories/landscaping.webp'),
  OTHER: require('../../assets/images/categories/other.webp'),
};

export const categoryImage = (category: string): ImageSource =>
  CATEGORY_IMAGE[category] ?? (CATEGORY_IMAGE.OTHER as ImageSource);
