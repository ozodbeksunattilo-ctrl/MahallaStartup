// O'zbekcha yorliqlar: TZ 4-bo'lim jadvali («Aholi ko'radigan yozuv»).

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Moderatsiyada',
  OPEN: 'Ovoz berilmoqda',
  REJECTED: 'Tuzatish kerak',
  MERGED: 'Birlashtirilgan',
  SELECTED: 'Oylik ovozda tanlandi',
  IN_PROGRESS: 'Jarayonda',
  REFERRED: 'Tashkilotdan javob kutilmoqda',
  RESOLVED: 'Hal qilingan',
};

export const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'ROAD', label: "Yo'l" },
  { value: 'LIGHTING', label: 'Yoritish' },
  { value: 'WASTE', label: 'Chiqindi' },
  { value: 'WATER', label: 'Suv' },
  { value: 'LANDSCAPING', label: 'Obodonlashtirish' },
  { value: 'OTHER', label: 'Boshqa' },
];

export const EVENT_STATUS: Record<string, string> = {
  PUBLISHED: 'Nashr qilingan',
  CANCELLED: 'Bekor qilingan',
  COMPLETED: 'Yakunlangan',
  DRAFT: 'Qoralama',
};

export const NOTIFICATION_ICONS: Record<string, string> = {
  ISSUE_STATUS_CHANGED: 'swap-horizontal-outline',
  ISSUE_REJECTED: 'create-outline',
  ROUND_WINNER: 'trophy-outline',
  FOLLOWED_ISSUE_UPDATE: 'eye-outline',
  AUTHOR_FEEDBACK: 'chatbox-ellipses-outline',
  EVENT_UPDATED: 'calendar-outline',
  EVENT_CANCELLED: 'close-circle-outline',
  EVENT_REMINDER: 'alarm-outline',
  IMPORTANT_ANNOUNCEMENT: 'megaphone-outline',
};
