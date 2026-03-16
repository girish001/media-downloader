/**
 * backend/src/lib/validateEnv.ts
 * ────────────────────────────────
 * Validates required environment variables at process startup.
 *
 * Supports both AWS_ naming (Railway / production standard) and
 * S3_ naming (legacy docker-compose / self-hosted MinIO) for S3 credentials.
 * Whichever set is present, they are normalised into S3_* for internal use.
 *
 * Call validateEnv() as the FIRST thing in server startup — before any
 * service connections — so misconfigured deployments fail fast with a
 * clear, human-readable error rather than a cryptic null-reference crash
 * deep inside a library.
 */

interface EnvSpec {
  key:         string;
  description: string;
  required:    boolean;
  default?:    string;
}

/** Core variables required by the backend. */
const BACKEND_ENV: EnvSpec[] = [
  // ── Database ──────────────────────────────────────────────────────────
  {
    key:         'DATABASE_URL',
    description: 'PostgreSQL connection string  (e.g. postgresql://user:pass@host:5432/db)',
    required:    true,
  },

  // ── Redis ─────────────────────────────────────────────────────────────
  {
    key:         'REDIS_URL',
    description: 'Redis connection string  (e.g. redis://:password@host:6379)',
    required:    true,
  },

  // ── S3 / AWS — checked as a GROUP (see s3GroupValid below) ───────────
  // Individual keys listed for documentation; group logic handles either set.

  // ── TTL ───────────────────────────────────────────────────────────────
  {
    key:         'FILE_TTL_HOURS',
    description: 'Hours before S3 objects are auto-deleted (e.g. 24)',
    required:    false,
    default:     '24',
  },

  // ── Size cap ──────────────────────────────────────────────────────────
  {
    key:         'MAX_VIDEO_SIZE_MB',
    description: 'Maximum output file size in MB (e.g. 500)',
    required:    false,
    default:     '500',
  },
];

/** S3 credential sets — either AWS_ OR S3_ naming is acceptable. */
const S3_AWS_KEYS  = ['AWS_ACCESS_KEY_ID',     'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',  'AWS_BUCKET'];
const S3_LEGACY_KEYS = ['S3_ACCESS_KEY',         'S3_SECRET_KEY',         'S3_REGION',   'S3_BUCKET'];

/**
 * Normalise AWS_ → S3_ env var aliases so the rest of the codebase only
 * needs to read S3_* names.  Call before any S3Client is instantiated.
 *
 * Mapping:
 *   AWS_ACCESS_KEY_ID     → S3_ACCESS_KEY
 *   AWS_SECRET_ACCESS_KEY → S3_SECRET_KEY
 *   AWS_REGION            → S3_REGION
 *   AWS_BUCKET            → S3_BUCKET
 */
export function normaliseS3Env(): void {
  const map: Record<string, string> = {
    AWS_ACCESS_KEY_ID:     'S3_ACCESS_KEY',
    AWS_SECRET_ACCESS_KEY: 'S3_SECRET_KEY',
    AWS_REGION:            'S3_REGION',
    AWS_BUCKET:            'S3_BUCKET',
  };

  for (const [awsKey, s3Key] of Object.entries(map)) {
    // If AWS_ key is set and S3_ key is NOT already set, copy it over.
    if (process.env[awsKey] && !process.env[s3Key]) {
      process.env[s3Key] = process.env[awsKey];
    }
  }
}

/**
 * Validate all required environment variables.
 * Throws a formatted Error listing every missing variable — never throws
 * one-at-a-time so operators see all problems in a single deploy log line.
 *
 * @param service  Label used in error messages ('backend' | 'worker')
 */
export function validateEnv(service: 'backend' | 'worker' = 'backend'): void {
  // Step 1 — normalise AWS_ aliases first so checks below see S3_* keys
  normaliseS3Env();

  const errors: string[] = [];

  // Step 2 — check standard vars
  for (const spec of BACKEND_ENV) {
    if (!spec.required) continue;
    const val = process.env[spec.key];
    if (!val || val.trim() === '') {
      errors.push(`  ✗  ${spec.key.padEnd(30)}  ${spec.description}`);
    }
  }

  // Step 3 — check S3 credentials (accept either AWS_ or S3_ naming)
  const hasAwsSet    = S3_AWS_KEYS.every(k    => process.env[k]?.trim());
  const hasLegacySet = S3_LEGACY_KEYS.every(k => process.env[k]?.trim());

  if (!hasAwsSet && !hasLegacySet) {
    // Determine which individual keys are missing from BOTH sets
    const missingAws    = S3_AWS_KEYS.filter(k    => !process.env[k]?.trim());
    const missingLegacy = S3_LEGACY_KEYS.filter(k => !process.env[k]?.trim());

    errors.push(
      '  ✗  S3 credentials missing. Provide EITHER the AWS_ set OR the S3_ set:',
      `       AWS_ set  (preferred): ${S3_AWS_KEYS.join(', ')}`,
      `       S3_ set   (legacy):    ${S3_LEGACY_KEYS.join(', ')}`,
      `       Missing from AWS_ set: ${missingAws.join(', ') || '(none)'}`,
      `       Missing from S3_ set:  ${missingLegacy.join(', ') || '(none)'}`,
    );
  }

  // Step 4 — fail fast with a full list
  if (errors.length > 0) {
    const divider = '─'.repeat(60);
    throw new Error(
      [
        '',
        divider,
        `  MediaProc ${service} — MISSING REQUIRED ENVIRONMENT VARIABLES`,
        divider,
        ...errors,
        divider,
        '  Set the above variables in your Railway service, .env file,',
        '  or docker-compose environment section and restart.',
        divider,
        '',
      ].join('\n')
    );
  }

  // Step 5 — soft-warn about optional-but-recommended vars
  const recommended: Array<[string, string]> = [
    ['FILE_TTL_HOURS',    'defaults to 24h — S3 files never auto-expire'],
    ['MAX_VIDEO_SIZE_MB', 'defaults to 500 MB — no size enforcement'],
    ['SENTRY_DSN',        'error monitoring disabled'],
    ['SIGNED_URL_TTL_SEC','defaults to 3600s (1h) download link expiry'],
  ];

  for (const [key, warn] of recommended) {
    if (!process.env[key]?.trim()) {
      console.warn(`[validateEnv] ⚠  ${key} not set — ${warn}`);
    }
  }
}

/**
 * Worker-specific required vars (subset — DATABASE_URL and REDIS_URL
 * are inherited from BACKEND_ENV above).
 */
const WORKER_ENV: EnvSpec[] = [
  {
    key:         'DATABASE_URL',
    description: 'PostgreSQL connection string',
    required:    true,
  },
  {
    key:         'REDIS_URL',
    description: 'Redis connection string',
    required:    true,
  },
  {
    key:         'MAX_VIDEO_SIZE_MB',
    description: 'Maximum output file size in MB',
    required:    false,
    default:     '500',
  },
];

/**
 * Validate env vars for the worker process.
 * Same S3 group logic as validateEnv() above.
 */
export function validateWorkerEnv(): void {
  normaliseS3Env();

  const errors: string[] = [];

  for (const spec of WORKER_ENV) {
    if (!spec.required) continue;
    if (!process.env[spec.key]?.trim()) {
      errors.push(`  ✗  ${spec.key.padEnd(30)}  ${spec.description}`);
    }
  }

  const hasAwsSet    = S3_AWS_KEYS.every(k    => process.env[k]?.trim());
  const hasLegacySet = S3_LEGACY_KEYS.every(k => process.env[k]?.trim());

  if (!hasAwsSet && !hasLegacySet) {
    const missingAws    = S3_AWS_KEYS.filter(k    => !process.env[k]?.trim());
    const missingLegacy = S3_LEGACY_KEYS.filter(k => !process.env[k]?.trim());
    errors.push(
      '  ✗  S3 credentials missing. Provide EITHER the AWS_ set OR the S3_ set:',
      `       AWS_ set:  ${S3_AWS_KEYS.join(', ')}`,
      `       S3_ set:   ${S3_LEGACY_KEYS.join(', ')}`,
      `       Missing from AWS_ set: ${missingAws.join(', ') || '(none)'}`,
      `       Missing from S3_ set:  ${missingLegacy.join(', ') || '(none)'}`,
    );
  }

  if (errors.length > 0) {
    const divider = '─'.repeat(60);
    throw new Error(
      [
        '',
        divider,
        '  MediaProc worker — MISSING REQUIRED ENVIRONMENT VARIABLES',
        divider,
        ...errors,
        divider,
        '  Set the above variables and restart the worker.',
        divider,
        '',
      ].join('\n')
    );
  }
}
