import { Platform } from 'react-native';

const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Android emulyatorda `localhost` — emulyatorning o'zi; kompyuter `10.0.2.2` orqali ochiladi. */
export const API_URL =
  Platform.OS === 'android'
    ? raw.replace('//localhost', '//10.0.2.2').replace('//127.0.0.1', '//10.0.2.2')
    : raw;
