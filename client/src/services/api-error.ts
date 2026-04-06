export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function throwIfNotOk(res: Response) {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  const message =
    body.length > 0 && body.length <= 200 && !body.startsWith('<') ? body : res.statusText;
  throw new ApiError(message, res.status);
}

export function getKeyQueryThrowIfInvalid(): string {
  const key = sessionStorage.getItem('adminKey');
  if (!key) throw new ApiError('Not signed in', 401);
  return `key=${encodeURIComponent(key)}`;
}
