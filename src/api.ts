/** Talks to the Django backend (backend/). Same origin: Vite proxies /api in development. */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? '';
}

type Options = { method?: 'GET' | 'POST' | 'PUT'; json?: unknown; form?: FormData; signal?: AbortSignal };

export async function api<T>(path: string, { method = 'GET', json, form, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRFToken'] = decodeURIComponent(csrfToken());
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      credentials: 'same-origin',
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('אין חיבור לשרת. בודקים את החיבור לאינטרנט ומנסים שוב.', 0);
  }

  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const message =
      (body && typeof body.error === 'string' && body.error) ||
      (res.status === 403 ? 'פג תוקף החיבור. מרעננים את העמוד ומתחברים מחדש.' : 'השרת לא הצליח לטפל בבקשה. נסו שוב בעוד רגע.');
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export type Session = { authenticated: boolean; username: string | null };
