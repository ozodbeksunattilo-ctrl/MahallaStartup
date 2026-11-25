import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { publicApiUrl, type Env } from '../config/env';
import { requestContext } from './request-context';

/** Kalitlar tekis (papkasiz): `<uuid>.jpg`, `<uuid>_t.jpg`, `<uuid>.mp4|mov`. Yo'l hujumlaridan himoya. */
export const STORAGE_KEY_RE = /^[0-9a-f-]{36}(_t)?\.(jpg|mp4|mov)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

export const contentTypeForKey = (key: string): string =>
  CONTENT_TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream';

export interface Storage {
  readonly kind: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Muddatli o'qish URL'i. S3'da tarmoq so'rovisiz lokal hisoblanadi. */
  signedUrl(key: string, ttlSec: number, now: Date): Promise<string>;
  ping(): Promise<void>;
}

export class LocalStorage implements Storage {
  readonly kind = 'local' as const;

  constructor(
    private readonly dir: string,
    private readonly secret: string,
    private readonly baseUrl: string,
    /** `PUBLIC_API_URL` aniq berilgan bo'lsa so'rov host'idan ustun (proksi ortida ichki host chiqib qolmasin) */
    private readonly fixedBaseUrl?: string,
  ) {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  private filePath(key: string): string {
    if (!STORAGE_KEY_RE.test(key)) throw new Error(`Noto'g'ri saqlash kaliti: ${key}`);
    return path.join(this.dir, key);
  }

  async put(key: string, body: Buffer): Promise<void> {
    await fs.promises.writeFile(this.filePath(key), body);
  }

  async delete(key: string): Promise<void> {
    await fs.promises.rm(this.filePath(key), { force: true });
  }

  async signedUrl(key: string, ttlSec: number, now: Date): Promise<string> {
    const exp = Math.floor(now.getTime() / 1000) + ttlSec;
    const base = this.fixedBaseUrl ?? requestContext.getStore()?.baseUrl ?? this.baseUrl;
    return `${base}/api/v1/files/${key}?exp=${exp}&sig=${this.sign(key, exp)}`;
  }

  async ping(): Promise<void> {
    await fs.promises.access(this.dir, fs.constants.W_OK);
  }

  sign(key: string, exp: number): string {
    return createHmac('sha256', this.secret).update(`${key}.${exp}`).digest('hex');
  }

  /** `GET /api/v1/files/:key` uchun: imzo va muddatni tekshiradi, fayl yo'lini qaytaradi. */
  verify(key: string, exp: number, sig: string, now: Date): string | null {
    if (!STORAGE_KEY_RE.test(key) || !Number.isFinite(exp) || exp * 1000 < now.getTime()) return null;
    const expected = Buffer.from(this.sign(key, exp));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const file = path.join(this.dir, key);
    return fs.existsSync(file) ? file : null;
  }
}

export class S3Storage implements Storage {
  readonly kind = 's3' as const;
  private readonly s3: S3Client;

  constructor(
    private readonly bucket: string,
    cfg: {
      endpoint: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    },
  ) {
    this.s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  signedUrl(key: string, ttlSec: number): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSec,
    });
  }

  async ping(): Promise<void> {
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

export function createStorage(env: Env): Storage {
  if (env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY) {
    return new S3Storage(env.S3_BUCKET, {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  return new LocalStorage(
    path.resolve(env.STORAGE_DIR),
    env.STORAGE_SIGNING_SECRET,
    publicApiUrl(env),
    env.PUBLIC_API_URL?.replace(/\/+$/, ''),
  );
}
