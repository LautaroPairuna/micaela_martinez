import * as crypto from 'crypto';

export function verifyMpWebhookSignature(opts: {
  secret: string;
  xSignature?: string;
  xRequestId?: string;
  dataIdUrl: string; // "data.id_url" (o construido)
}): { ok: boolean; ts?: string; reason?: string } {
  const { secret, xSignature, xRequestId, dataIdUrl } = opts;

  if (!xSignature || !xRequestId)
    return { ok: false, reason: 'missing_headers' };

  // x-signature: "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(',').map((kv) => {
      const [k, v] = kv.split('=').map((s) => s.trim());
      return [k, v];
    }),
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: 'invalid_signature_format' };

  const manifest = `id:${dataIdUrl};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  const ok = timingSafeEqualHex(computed, v1);
  return { ok, ts, reason: ok ? undefined : 'mismatch' };
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
