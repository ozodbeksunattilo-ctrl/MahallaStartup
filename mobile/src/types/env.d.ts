/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    /** `true` bo'lsa login talab qilinmaydi (faqat backend auth tayyor bo'lguncha ekranlarni ko'rish uchun) */
    EXPO_PUBLIC_SKIP_AUTH?: string;
    EXPO_PUBLIC_DEMO?: string;
    EXPO_PUBLIC_DEBUG?: string;
  }
}
