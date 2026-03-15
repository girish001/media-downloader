/**
 * worker/src/storage.ts
 * ──────────────────────
 * S3 upload helper for the worker.
 * Mirrors backend/src/services/storage.ts but standalone.
 */

import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  BucketAlreadyOwnedByYou,
  BucketAlreadyExists,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { stat }            from 'node:fs/promises';
import path                from 'node:path';

let _s3: S3Client | null = null;
let _bucketReady = false;

/**
 * Resolve S3 credentials from either AWS_ (Railway standard) or S3_ (legacy) naming.
 */
function resolveS3Config(): {
  accessKeyId:     string;
  secretAccessKey: string;
  region:          string;
  bucket:          string;
  endpoint?:       string;
  forcePathStyle:  boolean;
} {
  const accessKeyId     = (process.env.AWS_ACCESS_KEY_ID     || process.env.S3_ACCESS_KEY || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '').trim();
  const region          = (process.env.AWS_REGION            || process.env.S3_REGION     || 'auto').trim();
  const bucket          = (process.env.AWS_BUCKET            || process.env.S3_BUCKET     || '').trim();
  const endpoint        = (process.env.S3_ENDPOINT           || '').trim() || undefined;
  const forcePathStyle  = process.env.S3_PATH_STYLE === 'true';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('[worker/storage] S3 credentials not found. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.');
  }
  if (!bucket) {
    throw new Error('[worker/storage] S3 bucket not configured. Set AWS_BUCKET (or S3_BUCKET).');
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

const BUCKET = () => resolveS3Config().bucket;

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
};

export async function ensureBucketExists(): Promise<void> {
  if (_bucketReady) return;
  const s3 = getS3();
  const bucket = BUCKET();

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    _bucketReady = true;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchBucket') {
      try {
        const region = resolveS3Config().region;
        await s3.send(new CreateBucketCommand({
          Bucket: bucket,
          ...(region && region !== 'us-east-1' && region !== 'auto'
            ? { CreateBucketConfiguration: { LocationConstraint: region as any } }
            : {}),
        }));
        _bucketReady = true;
        console.info(`[storage] Bucket "${bucket}" created.`);
      } catch (createErr: any) {
        if (createErr instanceof BucketAlreadyOwnedByYou || createErr instanceof BucketAlreadyExists) {
          _bucketReady = true;
        } else {
          throw createErr;
        }
      }
    } else {
      throw err;
    }
  }
}

const MAX_VIDEO_SIZE_MB = Number(process.env.MAX_VIDEO_SIZE_MB || 500);

export async function uploadFile(localPath: string, key: string): Promise<number> {
  await ensureBucketExists();

  const fileStat = await stat(localPath);

  // Enforce size limit before attempting upload
  if (MAX_VIDEO_SIZE_MB > 0) {
    const sizeMB = fileStat.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      throw new Error(
        `Output file is ${sizeMB.toFixed(1)} MB, exceeding the ${MAX_VIDEO_SIZE_MB} MB limit. ` +
        `Try a lower quality format or increase MAX_VIDEO_SIZE_MB.`
      );
    }
  }

  const ext = path.extname(localPath).toLowerCase();

  await getS3().send(new PutObjectCommand({
    Bucket:        BUCKET(),
    Key:           key,
    Body:          createReadStream(localPath),
    ContentType:   MIME[ext] ?? 'application/octet-stream',
    ContentLength: fileStat.size,
  }));

  return fileStat.size;
}

export function jobKey(jobId: string, format: string): string {
  return `outputs/${jobId}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
}
