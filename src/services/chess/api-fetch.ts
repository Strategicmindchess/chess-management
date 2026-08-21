export interface RetryOptions {
  label?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  accept?: string;
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number; attempts: number }
  | { ok: false; error: string; status?: number; attempts: number; retryable: boolean };

const BACKOFF_MS = [5_000, 15_000, 30_000];

function jitter(ms: number): number {
  return Math.round(ms * (0.9 + Math.random() * 0.2));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function apiFetch<T>(
  url: string,
  opts: RetryOptions,
  attempt = 0
): Promise<ApiResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 20000;
  
  const headers: Record<string, string> = {
    'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
    Accept: opts.accept ?? 'application/json',
    ...opts.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as T;
      return { ok: true, data, status: res.status, attempts: attempt + 1 };
    }

    if (isRetryableStatus(res.status) && attempt < maxAttempts - 1) {
      const delay = jitter(BACKOFF_MS[attempt] || BACKOFF_MS[BACKOFF_MS.length - 1]);
      console.warn(`${opts.label ?? '[API]'} HTTP ${res.status} for ${url} — waiting ${delay/1000}s (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return apiFetch<T>(url, opts, attempt + 1);
    }
    
    if (attempt >= maxAttempts - 1 && isRetryableStatus(res.status)) {
       console.error(`${opts.label ?? '[API]'} HTTP ${res.status} — max retries (${maxAttempts}) exceeded for ${url}`);
    } else {
       console.error(`${opts.label ?? '[API]'} API error ${res.status} for ${url}`);
    }

    return { 
      ok: false, 
      error: `HTTP ${res.status}`, 
      status: res.status, 
      attempts: attempt + 1,
      retryable: isRetryableStatus(res.status)
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    const isTimeout = err.name === 'AbortError';
    if ((isTimeout || err.message.includes('fetch')) && attempt < maxAttempts - 1) {
      const delay = jitter(BACKOFF_MS[attempt] || BACKOFF_MS[BACKOFF_MS.length - 1]);
      console.warn(`${opts.label ?? '[API]'} Network error/timeout for ${url} — waiting ${delay/1000}s (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return apiFetch<T>(url, opts, attempt + 1);
    }

    console.error(`${opts.label ?? '[API]'} Fetch failed for ${url}:`, err);
    return { 
      ok: false, 
      error: isTimeout ? 'Timeout' : (err.message || 'Network error'), 
      attempts: attempt + 1,
      retryable: true 
    };
  }
}

export async function apiNdjsonFetch<T>(
  url: string,
  opts: RetryOptions,
  attempt = 0
): Promise<ApiResult<T[]>> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 20000;
  
  const headers: Record<string, string> = {
    'User-Agent': 'SMC-CRM/1.0 (chess@strategicmindchess.in)',
    Accept: opts.accept ?? 'application/x-ndjson',
    ...opts.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      const results: T[] = [];
      
      const lines = text.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          results.push(JSON.parse(line));
        } catch (parseErr) {
          return { ok: false, error: 'NDJSON parse error on line', status: res.status, attempts: attempt + 1, retryable: false };
        }
      }
      return { ok: true, data: results, status: res.status, attempts: attempt + 1 };
    }

    if (isRetryableStatus(res.status) && attempt < maxAttempts - 1) {
      const delay = jitter(BACKOFF_MS[attempt] || BACKOFF_MS[BACKOFF_MS.length - 1]);
      console.warn(`${opts.label ?? '[API]'} HTTP ${res.status} for ${url} — waiting ${delay/1000}s (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return apiNdjsonFetch<T>(url, opts, attempt + 1);
    }
    
    if (attempt >= maxAttempts - 1 && isRetryableStatus(res.status)) {
       console.error(`${opts.label ?? '[API]'} HTTP ${res.status} — max retries (${maxAttempts}) exceeded for ${url}`);
    } else {
       console.error(`${opts.label ?? '[API]'} API error ${res.status} for ${url}`);
    }

    return { 
      ok: false, 
      error: `HTTP ${res.status}`, 
      status: res.status, 
      attempts: attempt + 1,
      retryable: isRetryableStatus(res.status)
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    const isTimeout = err.name === 'AbortError';
    if ((isTimeout || err.message.includes('fetch')) && attempt < maxAttempts - 1) {
      const delay = jitter(BACKOFF_MS[attempt] || BACKOFF_MS[BACKOFF_MS.length - 1]);
      console.warn(`${opts.label ?? '[API]'} Network error/timeout for ${url} — waiting ${delay/1000}s (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
      return apiNdjsonFetch<T>(url, opts, attempt + 1);
    }

    console.error(`${opts.label ?? '[API]'} Fetch failed for ${url}:`, err);
    return { 
      ok: false, 
      error: isTimeout ? 'Timeout' : (err.message || 'Network error'), 
      attempts: attempt + 1,
      retryable: true 
    };
  }
}
