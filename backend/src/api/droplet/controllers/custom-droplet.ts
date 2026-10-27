import {
  DRAFT_GONE_MESSAGE,
  publishEdit,
  PublishEditError,
  type DraftRef,
} from '../../../lib/publish-edit';

const MAX_INT = 2147483647; // Postgres integer column limit
const isRowId = (n: number) => Number.isSafeInteger(n) && n > 0 && n <= MAX_INT;

// `:id` is the draft's numeric id or its documentId.
function parseDraftRef(ref: unknown): DraftRef | null {
  if (typeof ref !== 'string') return null;
  if (/^\d+$/.test(ref))
    return isRowId(Number(ref)) ? { id: Number(ref) } : null;
  if (/^[A-Za-z0-9]+$/.test(ref)) return { documentId: ref };
  return null;
}

/** Returns the validated originalDropletId, or an error message. Any other body key is rejected. */
function parseBody(
  body: unknown,
): { originalDropletId: number } | { error: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be an object' };
  }
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => key !== 'originalDropletId');
  if (extra) return { error: `Invalid key ${extra}` };
  const id = record.originalDropletId;
  if (typeof id !== 'number' || !isRowId(id)) {
    return { error: 'originalDropletId must be a positive integer' };
  }
  return { originalDropletId: id };
}

const ERROR_NAMES: Record<number, string> = {
  400: 'BadRequestError',
  404: 'NotFoundError',
  409: 'ConflictError',
  500: 'InternalServerError',
};

function fail(ctx: any, status: number, message: string) {
  ctx.status = status;
  ctx.body = {
    data: null,
    error: { status, name: ERROR_NAMES[status], message, details: {} },
  };
}

export default {
  async publishEdit(ctx) {
    // The trust boundary is the Next.js action, which checks the user before calling this route.
    const draft = parseDraftRef(ctx.params.id);
    if (!draft) return fail(ctx, 404, DRAFT_GONE_MESSAGE);

    const body = parseBody(ctx.request.body);
    if ('error' in body) return fail(ctx, 400, body.error);

    try {
      const data = await publishEdit({
        draft,
        originalDropletId: body.originalDropletId,
      });
      ctx.body = { data };
    } catch (err) {
      if (err instanceof PublishEditError)
        return fail(ctx, err.status, err.message);
      if ((err as Error)?.name === 'ValidationError') {
        const { message, details } = err as {
          message: string;
          details?: { errors?: { path?: string[] }[] };
        };
        const path = details?.errors?.[0]?.path?.join('.');
        const reason = path ? `${message}, field: ${path}` : message;
        return fail(
          ctx,
          400,
          `Publishing failed (${reason}). Nothing was changed.`,
        );
      }
      strapi.log.error('publishEdit failed', err);
      return fail(
        ctx,
        500,
        'Publishing failed. Nothing was changed. Try again.',
      );
    }
  },
};
