/**
 * frontend/src/app/api/[...path]/route.ts
 * ─────────────────────────────────────────
 * Runtime reverse proxy — forwards all /api/* requests to the backend.
 *
 * IMPORTANT: BACKEND_URL is read INSIDE the proxy() function, not at module
 * level. This guarantees it is resolved from the live process environment on
 * every request — never cached or inlined at build time by Next.js.
 *
 *   Docker:  set BACKEND_URL=http://backend:4000 in docker-compose.yml ✓
 *   Railway: set BACKEND_URL=https://<backend-service>.up.railway.app
 *            in Railway dashboard → Frontend service → Variables tab ✓
 */

import { NextRequest, NextResponse } from 'next/server';

// Headers that must not be forwarded (hop-by-hop)
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host',
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

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  // Read per-request — never at module level or build time
  const backendUrl = (process.env.BACKEND_URL || 'http://backend:4000').replace(/\/$/, '');

  const apiPath = path.join('/');
  const search  = req.nextUrl.search ?? '';
  const target  = `${backendUrl}/api/${apiPath}${search}`;

  try {
    const upstream = await fetch(target, {
      method:  req.method,
      headers: forwardHeaders(req.headers),
      body:    ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      // @ts-ignore — duplex required for streaming POST bodies in Node 18+ fetch
      duplex: 'half',
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

export async function GET    (req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
export async function POST   (req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
export async function PUT    (req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
export async function PATCH  (req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
export async function DELETE (req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
export async function OPTIONS(req: NextRequest, { params }: { params: { path: string[] } }) { return proxy(req, params.path); }
