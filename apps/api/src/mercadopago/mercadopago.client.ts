import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MpFetchOpts = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  idempotencyKey?: string;
};

@Injectable()
export class MercadoPagoClient {
  private readonly logger = new Logger(MercadoPagoClient.name);
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    const t = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!t) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN');
    this.accessToken = t;
  }

  async request<T>(opts: MpFetchOpts): Promise<T> {
    const url = `${this.baseUrl}${opts.path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey;

    const res = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }

    if (!res.ok) {
      this.logger.error(`MP ERROR ${opts.method} ${opts.path} -> ${res.status}`, json);
      // evitamos filtrar datos sensibles; devolvemos mensaje genérico
      throw new Error(`MercadoPago error: ${res.status}`);
    }
    return json as T;
  }
}