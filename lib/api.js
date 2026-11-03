import { z } from 'zod';
export function failure(e) { return Response.json({ error: e instanceof z.ZodError ? e.errors[0].message : e.message || 'Amal bajarilmadi.' }, { status: e instanceof z.ZodError ? 400 : e.status || 400 }); }
export function checkOrigin(request) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  // Next's proxy can normalize request.url to localhost while retaining the
  // browser's original Host header (for example 127.0.0.1 in local preview).
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1);
  const expected = `${protocol}://${request.headers.get('host') || url.host}`;
  if (!origin || origin !== expected) throw Object.assign(new Error('So‘rov manbasi rad etildi.'), { status: 403 });
}
