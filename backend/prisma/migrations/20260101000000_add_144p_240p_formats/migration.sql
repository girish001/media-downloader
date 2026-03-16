-- AddValue: MP4_240P and MP4_144P to OutputFormat enum
-- PostgreSQL requires ALTER TYPE … ADD VALUE for enum extensions.
-- These are append-only — no existing rows are touched.

ALTER TYPE "OutputFormat" ADD VALUE IF NOT EXISTS 'MP4_240P';
ALTER TYPE "OutputFormat" ADD VALUE IF NOT EXISTS 'MP4_144P';
