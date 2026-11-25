import { route } from '../../core/http';

/**
 * Mobil ilova yangilanishi: ilova ochilganda shu yerdan so'nggi versiyani so'raydi; o'zidagi versiya eskiroq bo'lsa
 * «Yangilash» oynasini ko'rsatadi va `downloadUrl` (yangi APK) ni ochadi. Qiymatlar Railway env'dan:
 *   MOBILE_LATEST_VERSION — so'nggi versiya (app.json `version`, masalan 0.2.0)
 *   MOBILE_MIN_VERSION    — bundan eski versiya majburiy yangilanadi (ixtiyoriy)
 *   MOBILE_DOWNLOAD_URL   — yangi APK havolasi (EAS build sahifasi yoki to'g'ridan .apk)
 *   MOBILE_RELEASE_NOTES  — qisqa izoh (ixtiyoriy)
 */
const version = route({
  method: 'get',
  path: '/app/version',
  auth: 'public',
  tag: 'Ilova',
  summary: "Mobil ilovaning so'nggi versiyasi va yuklab olish havolasi (yangilash oynasi uchun)",
  handler: ({ deps }) => {
    const env = deps.env;
    const latest = env.MOBILE_LATEST_VERSION;
    return {
      android:
        latest && env.MOBILE_DOWNLOAD_URL
          ? {
              latestVersion: latest,
              minVersion: env.MOBILE_MIN_VERSION ?? null,
              downloadUrl: env.MOBILE_DOWNLOAD_URL,
              notes: env.MOBILE_RELEASE_NOTES ?? null,
            }
          : null,
    };
  },
});

export const appRoutes = [version];
