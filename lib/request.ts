interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, unknown>;
}

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

function rateLimitDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, seconds * 1000));
    }

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, date - Date.now()));
    }
  }

  const jitter = Math.floor(Math.random() * 250);
  return Math.min(MAX_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS * 2 ** attempt + jitter);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function getConfig() {
  const baseUrl = process.env.TEABLE_API_URL;
  const token = process.env.TEABLE_APP_TOKEN;
  const appId = process.env.TEABLE_APP_ID ?? '';
  const baseId = process.env.TEABLE_BASE_ID ?? '';
  if (!baseUrl) throw new Error('TEABLE_API_URL environment variable is not set');
  if (!token) throw new Error('TEABLE_APP_TOKEN environment variable is not set');
  return { baseUrl, token, appId, baseId };
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { baseUrl, token } = getConfig();
  const { method = 'GET', body, params } = options;
  const canRetryRateLimit = method === 'GET'
    || endpoint.endsWith('/sql-query')
    || endpoint.endsWith('/auth/validate-session');

  let url = `${baseUrl}/api${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
        return;
      }
      searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 429 && canRetryRateLimit && attempt < MAX_RATE_LIMIT_RETRIES) {
      await response.text().catch(() => undefined);
      await wait(rateLimitDelay(response, attempt));
      continue;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Teable API Error [${response.status}]: ${error.message || 'Unknown error'}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }
}
