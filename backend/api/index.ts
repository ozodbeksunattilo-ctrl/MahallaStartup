/**
 * Vercel kirish nuqtasi (serverless). Oddiy server — src/server.ts (Railway/Render/lokal).
 *
 * Farqlar:
 *  - Ilova har nusxada bir marta quriladi va "issiq" so'rovlarda qayta ishlatiladi.
 *  - setInterval o'rniga fon vazifalari so'rovlar ortidan, muddati kelganda bajariladi (waitUntil).
 *  - Socket.IO yo'q: chat REST orqali ishlaydi (`GET /chat/messages?after=`).
 *  - Migratsiyalar bu yerda bajarilmaydi: `pnpm db:migrate` ni DATABASE_URL bilan lokal ishga tushiring.
 * shortcut: STORAGE_DIR=/tmp bo'lsa media nusxalar orasida yo'qolishi mumkin; doimiy saqlash uchun S3_* (Supabase Storage) bering.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { waitUntil } from '@vercel/functions';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { systemClock } from '../src/core/clock';
import { createDb } from '../src/core/db';
import { noopRealtime, type Deps, type JobName } from '../src/core/deps';
import { createKv } from '../src/core/kv';
import { createLogger } from '../src/core/logger';
import { createStorage } from '../src/core/storage';
import { jobTasks } from '../src/jobs';

/** Vazifa necha ms da bir marta bajarilsin (src/jobs/index.ts dagi oraliqlar bilan bir xil). */
const EVERY: Partial<Record<JobName, number>> = {
  'ensure-rounds': 60 * 60_000,
  'close-rounds': 5 * 60_000,
  'event-reminders': 10 * 60_000,
  'announcement-fanout': 30_000,
  push: 30_000,
};

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function build(): Promise<{ app: Handler; tick: () => Promise<void> }> {
  const env = loadEnv();
  const log = createLogger(env);
  const db = await createDb({ url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX });
  const running = new Map<JobName, Promise<void>>();
  const lastRun = new Map<JobName, number>();

  const deps: Deps = {
    env,
    db,
    kv: createKv(env.REDIS_URL),
    storage: createStorage(env),
    clock: systemClock,
    log,
    realtime: noopRealtime,
    jobs: { kick: (name) => waitUntil(run(name)), stop: async () => undefined },
  };
  const tasks = jobTasks(deps);

  // Bir nusxada bir vazifa bir vaqtda bitta; ko'p nusxada xavfsizligini vazifalarning o'zi ta'minlaydi (FOR UPDATE, dedupeKey).
  function run(name: JobName): Promise<void> {
    const active = running.get(name);
    if (active) return active;
    lastRun.set(name, Date.now());
    const p = tasks[name]()
      .then(() => undefined)
      .catch((err: unknown) => log.error({ err, job: name }, 'fon vazifasi xatosi'))
      .finally(() => running.delete(name));
    running.set(name, p);
    return p;
  }

  async function tick() {
    const now = Date.now();
    const due = (Object.entries(EVERY) as [JobName, number][]).filter(([name, ms]) => now - (lastRun.get(name) ?? 0) >= ms);
    // ensure-rounds birinchi: davr bo'lmasa close-rounds hech narsa qilmaydi
    for (const [name] of due) await run(name);
  }

  return { app: createApp(deps) as unknown as Handler, tick };
}

let ready: ReturnType<typeof build> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  ready ??= build().catch((err: unknown) => {
    ready = undefined; // keyingi so'rov qayta urinsin (masalan, baza vaqtincha ishlamasa)
    throw err;
  });
  const { app, tick } = await ready;
  waitUntil(tick());
  app(req, res);
}
