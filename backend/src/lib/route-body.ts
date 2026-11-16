// Strict body checks shared by the custom routes: they get no strict input
// check from Strapi, so each route checks its own keys.
const MAX_INT = 2147483647; // Postgres integer column limit

export const isRowId = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;
export const isCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX_INT;
export const isText = (s: unknown, max: number): s is string =>
  typeof s === 'string' && s.length > 0 && s.length <= max;

const ERROR_NAMES: Record<number, string> = {
  400: 'BadRequestError',
  403: 'ForbiddenError',
  404: 'NotFoundError',
  429: 'TooManyRequestsError',
  500: 'InternalServerError',
};

export function fail(ctx: any, status: number, message: string) {
  ctx.status = status;
  ctx.body = {
    data: null,
    error: { status, name: ERROR_NAMES[status], message, details: {} },
  };
}

/**
 * Strict body parse. userId comes from the body because Strapi receives the
 * shared service token; the Next.js server resolves it from the session.
 */
export function parseBody(
  body: unknown,
  allowed: string[],
  ids: string[],
): { body: Record<string, unknown> } | { invalid: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { invalid: 'Body must be an object' };
  }
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !allowed.includes(key));
  if (extra) return { invalid: `Invalid key ${extra}` };
  for (const key of ids) {
    if (!isRowId(record[key])) return { invalid: `${key} must be a positive integer` };
  }
  return { body: record };
}
