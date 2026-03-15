/**
 * frontend/src/app/api/[...path]/route.ts
 * ─────────────────────────────────────────
 * Runtime reverse proxy — forwards all /api/* requests to the backend.
 *
 * FIXES:
 *  1. await params — Next.js 15 made params async. Accessing params.path
 *     synchronously throws in Next.js 15+. We await params first.
 *  2. Body buffering — req.body is a ReadableStream. We buffer POST/PUT/PATCH
 *     bodies to avoid stream-consumed errors on retry or middleware inspection.
 *  3. Content-Length stripped — avoid mismatch after buffering.
 */

import { NextRequest, NextResponse } from 'next/server';

// Headers that must not be forwarded (hop-by-hop)
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host',
  'content-length', // recalculated after buffering
]);

function forwardHeaders(incoming: Headers): HeadersInit {
  const out: Record<string, string> = {};
  incoming.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      out[key] = value;
    }
  });
  return out;
}

async function proxy(
  req: NextRequest,
  // FIX: params may be a Promise in Next.js 15 — always await
  paramsPromise: Promise<{ path: string[] }> | { path: string[] }
): Promise<NextResponse> {
  // Await params (safe in both Next.js 14 and 15)
  const params = await Promise.resolve(paramsPromise);

  // Read per-request — never at module level or build time
  const backendUrl = (process.env.BACKEND_URL || 'http://backend:4000').replace(/\/$/, '');

  const apiPath = params.path.join('/');
  const search  = req.nextUrl.search ?? '';
  const target  = `${backendUrl}/api/${apiPath}${search}`;

  try {
    // FIX: Buffer body for POST/PUT/PATCH to avoid stream issues.
    // For GET/HEAD, body must be undefined (fetch throws otherwise).
    let body: BodyInit | undefined = undefined;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // arrayBuffer() reads the full body once — safe to pass to fetch
      body = await req.arrayBuffer();
    }

    const upstream = await fetch(target, {
      method:  req.method,
      headers: forwardHeaders(req.headers),
      body,
    });

    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(upstream.body, {
      status:  upstream.status,
      headers: resHeaders,
    });

  } catch (err: any) {
    const hint = process.env.BACKEND_URL
      ? `BACKEND_URL is set to: ${process.env.BACKEND_URL}`
      : `BACKEND_URL is NOT set — add it in Railway → Frontend service → Variables`;

    console.error(`[proxy] ${target} — ${err.message} — ${hint}`);

    return NextResponse.json(
      {
        statusCode: 502,
        error:      'Bad Gateway',
        message:    'Could not reach the backend service.',
        hint,
      },
      { status: 502 }
    );
  }
}

export async function GET    (req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
export async function POST   (req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
export async function PUT    (req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
export async function PATCH  (req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
export async function DELETE (req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) { return proxy(req, params); }
