/**
 * services/storage.ts
 * ────────────────────
 * S3-compatible storage with:
 *  ✓ Bucket auto-creation
 *  ✓ S3 Lifecycle rule — auto-delete outputs/ after FILE_TTL_HOURS (default 24h)
 *  ✓ signedUrl() — generates private, expiring pre-signed download URLs
 *  ✓ checkSizeLimit() — rejects files exceeding MAX_VIDEO_SIZE_MB before upload
 *  ✓ Works with Cloudflare R2, AWS S3, MinIO, Backblaze B2
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
  BucketAlreadyOwnedByYou,
  BucketAlreadyExists,
} from '@aws-sdk/client-s3';
import { getSignedUrl }    from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'node:fs';
import { stat }            from 'node:fs/promises';
import path                from 'node:path';

let _s3: S3Client | null  = null;
let _bucketReady           = false;
let _lifecycleReady        = false;

/**
 * Resolve S3 credentials — accept either AWS_ (Railway/production standard)
 * or S3_ (legacy docker-compose/MinIO) naming.  AWS_ takes priority when both
 * are present.  Called lazily when the first S3Client is built.
 */
function resolveS3Config(): {
  accessKeyId:     string;
  secretAccessKey: string;
  region:          string;
  bucket:          string;
  endpoint?:       string;
  forcePathStyle:  boolean;
} {
  const accessKeyId     = (process.env.AWS_ACCESS_KEY_ID     || process.env.S3_ACCESS_KEY     || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY     || '').trim();
  const region          = (process.env.AWS_REGION            || process.env.S3_REGION          || 'auto').trim();
  const bucket          = (process.env.AWS_BUCKET            || process.env.S3_BUCKET          || '').trim();
  const endpoint        = (process.env.S3_ENDPOINT           || '').trim() || undefined;
  const forcePathStyle  = process.env.S3_PATH_STYLE === 'true';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      '[storage] S3 credentials not found. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY ' +
      '(or S3_ACCESS_KEY + S3_SECRET_KEY for legacy setups).'
    );
  }
  if (!bucket) {
    throw new Error('[storage] S3 bucket not configured. Set AWS_BUCKET (or S3_BUCKET).');
  }

  return { accessKeyId, secretAccessKey, region, bucket, endpoint, forcePathStyle };
}

function getS3(): S3Client {
  if (!_s3) {
    const cfg = resolveS3Config();
    _s3 = new S3Client({
      endpoint:    cfg.endpoint,
      region:      cfg.region,
      credentials: {
        accessKeyId:     cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: cfg.forcePathStyle,
    });
  }
  return _s3;
}

const BUCKET      = ()  => resolveS3Config().bucket;
const PUBLIC_URL  = ()  => (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
const TTL_DAYS    = ()  => Math.max(1, Math.ceil(Number(process.env.FILE_TTL_HOURS || 24) / 24));

// Maximum video file size accepted for upload (MB). Applies BEFORE upload to catch
// oversized files early. Set MAX_VIDEO_SIZE_MB=0 to disable.
const MAX_VIDEO_SIZE_MB = Number(process.env.MAX_VIDEO_SIZE_MB || 500);

const MIME: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.mp3':  'audio/mpeg',
  '.webm': 'video/webm',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
};

/* ─── Bucket initialisation ──────────────────────────────────────── */

export async function ensureBucketExists(): Promise<void> {
  if (_bucketReady) return;

  const s3     = getS3();
  const bucket = resolveS3Config().bucket;
  if (!bucket) throw new Error('[storage] S3 bucket not configured. Set AWS_BUCKET (or S3_BUCKET).');

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.info(`[storage] Bucket "${bucket}" confirmed.`);
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === 'NoSuchBucket') {
      await _createBucket(bucket);
    } else if (status === 403) {
      throw new Error(`[storage] Bucket "${bucket}" access denied — check credentials.`);
    } else {
      throw err;
    }
  }

  _bucketReady = true;
  await _applyLifecycleRule(bucket).catch(err =>
    console.warn(`[storage] Lifecycle rule skipped (non-fatal): ${err.message}`)
  );
}

async function _createBucket(bucket: string): Promise<void> {
  const s3     = getS3();
  const region = resolveS3Config().region;
  try {
    await s3.send(new CreateBucketCommand({
      Bucket: bucket,
      ...(region && region !== 'us-east-1' && region !== 'auto'
        ? { CreateBucketConfiguration: { LocationConstraint: region as any } }
        : {}),
    }));
    console.info(`[storage] Bucket "${bucket}" created.`);
  } catch (err: any) {
    if (err instanceof BucketAlreadyOwnedByYou || err instanceof BucketAlreadyExists) return;
    throw new Error(`[storage] Cannot create bucket "${bucket}": ${err.message}`);
  }
}

async function _applyLifecycleRule(bucket: string): Promise<void> {
  if (_lifecycleReady) return;

  const s3      = getS3();
  const ttlDays = TTL_DAYS();
  const ruleId  = 'mediaproc-outputs-expiry';

  try {
    const existing = await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
    const rule = existing.Rules?.find(r => r.ID === ruleId);
    if (rule?.Expiration?.Days === ttlDays && rule?.Status === 'Enabled') {
      _lifecycleReady = true;
      console.info(`[storage] Lifecycle rule OK: outputs/ expires after ${ttlDays}d.`);
      return;
    }
  } catch { /* no existing rule */ }

  await s3.send(new PutBucketLifecycleConfigurationCommand({
    Bucket: bucket,
    LifecycleConfiguration: {
      Rules: [{
        ID:     ruleId,
        Status: 'Enabled',
        Filter: { Prefix: 'outputs/' },
        Expiration: { Days: ttlDays },
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
      }],
    },
  }));

  _lifecycleReady = true;
  console.info(`[storage] Lifecycle rule applied: outputs/ auto-deleted after ${ttlDays}d.`);
}

/* ─── Public API ─────────────────────────────────────────────────── */

/**
 * Check a local file against MAX_VIDEO_SIZE_MB limit.
 * Throws an Error if the file exceeds the configured maximum.
 * Call before uploadFile() in the worker.
 */
export async function checkSizeLimit(localPath: string): Promise<void> {
  if (MAX_VIDEO_SIZE_MB <= 0) return; // disabled

  const info    = await stat(localPath);
  const sizeMB  = info.size / (1024 * 1024);
  const limitMB = MAX_VIDEO_SIZE_MB;

  if (sizeMB > limitMB) {
    throw new Error(
      `Output file is ${sizeMB.toFixed(1)} MB, which exceeds the ${limitMB} MB limit. ` +
      `Try a lower quality format, or increase MAX_VIDEO_SIZE_MB.`
    );
  }
}

/**
 * Upload a local file to S3.
 * Validates size limit first, then streams the file.
 * Returns actual file size in bytes.
 */
export async function uploadFile(localPath: string, key: string): Promise<number> {
  await ensureBucketExists();
  await checkSizeLimit(localPath);

  const ext      = path.extname(localPath).toLowerCase();
  const fileStat = await stat(localPath);

  await getS3().send(new PutObjectCommand({
    Bucket:        BUCKET(),
    Key:           key,
    Body:          createReadStream(localPath),
    ContentType:   MIME[ext] ?? 'application/octet-stream',
    ContentLength: fileStat.size,
  }));

  return fileStat.size;
}

/** Delete a key from S3. */
export async function deleteFile(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

/** Check whether a key exists. */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await getS3().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
    return true;
  } catch { return false; }
}

/**
 * Generate a time-limited pre-signed download URL.
 * The URL grants temporary GET access to a private S3 object.
 * Default TTL: SIGNED_URL_TTL_SEC env var (default 3600 = 1 hour).
 *
 * Use this instead of publicUrl() for private buckets.
 */
export async function signedUrl(key: string, expiresIn?: number): Promise<string> {
  const ttl = expiresIn ?? Number(process.env.SIGNED_URL_TTL_SEC || 3600);

  // If a public URL base is configured, create a separate S3 client that signs
  // with the public endpoint so the signature stays valid when served to clients.
  // Without this, signing with the internal Docker hostname (minio:9000) and then
  // replacing the host in the URL causes a SignatureDoesNotMatch error.
  const publicBase = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
  const internalEndpoint = process.env.S3_ENDPOINT || '';

  const needsPublicClient = publicBase && publicBase !== internalEndpoint;

  const signingClient = needsPublicClient
    ? (() => {
        const cfg = resolveS3Config();
        return new S3Client({
          endpoint:    publicBase,
          region:      cfg.region,
          credentials: {
            accessKeyId:     cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
          },
          forcePathStyle: cfg.forcePathStyle,
        });
      })()
    : getS3();

  // Derive a friendly filename from the key (e.g. "outputs/abc123.mp4" → "abc123.mp4")
  const filename = key.split('/').pop() ?? 'download';

  // ResponseContentDisposition tells the browser (and MinIO/S3) to treat this as
  // a file download — not inline playback. This works even for cross-origin URLs
  // where the <a download> attribute is ignored by browsers.
  const url = await getSignedUrl(
    signingClient,
    new GetObjectCommand({
      Bucket: BUCKET(),   // FIX: was process.env.S3_BUCKET (undefined when using AWS_BUCKET)
      Key:    key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: ttl },
  );

  return url;
}

/** Public CDN URL — only use when bucket objects are publicly readable. */
export function publicUrl(key: string): string {
  return `${PUBLIC_URL()}/${key}`;

}

/** Canonical S3 key for a job output file. */
export function jobKey(jobId: string, format: string): string {
  return `outputs/${jobId}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
}
