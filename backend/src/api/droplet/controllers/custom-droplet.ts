import {
  DRAFT_GONE_MESSAGE,
  publishEdit,
  PublishEditError,
  type DraftRef,
} from '../../../lib/publish-edit';
import {
  publishWithReview,
  sendFeedback,
  submitForReview,
  withdrawFromReview,
} from '../../../lib/review-workflow';

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

/** Body must be a plain object with no keys. */
function parseEmptyBody(body: unknown): { error: string } | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be an object' };
  }
  const extra = Object.keys(body)[0];
  return extra ? { error: `Invalid key ${extra}` } : null;
}

const MAX_NOTE = 5000;

/** Strict body parse: exactly the allowed keys, `reviewerId` always required. */
function parseReviewBody(
  body: unknown,
  allowed: string[],
): Record<string, unknown> | { error: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be an object' };
  }
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !allowed.includes(key));
  if (extra) return { error: `Invalid key ${extra}` };
  const id = record.reviewerId;
  if (typeof id !== 'number' || !isRowId(id)) {
    return { error: 'reviewerId must be a positive integer' };
  }
  return record;
}

/** A Strapi ValidationError's message, plus the field it points at when there is one. */
function validationMessage(err: unknown): string {
  const { message, details } = err as {
    message: string;
    details?: { errors?: { path?: string[] }[] };
  };
  const path = details?.errors?.[0]?.path?.join('.');
  return path ? `${message}, field: ${path}` : message;
}

/** Runs a workflow step and maps its errors to HTTP statuses. */
async function run(ctx: any, fn: () => Promise<unknown>, failMessage: string) {
  try {
    ctx.body = { data: await fn() };
  } catch (err) {
    if (err instanceof PublishEditError)
      return fail(ctx, err.status, err.message);
    if ((err as Error)?.name === 'ValidationError') {
      const what = failMessage.replace(/\.$/, '');
      return fail(
        ctx,
        400,
        `${what} (${validationMessage(err)}). Nothing was changed.`,
      );
    }
    strapi.log.error(failMessage, err);
    return fail(ctx, 500, `${failMessage} Nothing was changed. Try again.`);
  }
}

/** Handler for a route whose body is `{}` and whose `:id` is a droplet ref. */
const emptyBodyHandler =
  (step: (ref: DraftRef) => Promise<unknown>, failMessage: string) =>
  async (ctx: any) => {
    const ref = parseDraftRef(ctx.params.id);
    if (!ref) return fail(ctx, 404, DRAFT_GONE_MESSAGE);
    const bad = parseEmptyBody(ctx.request.body);
    if (bad) return fail(ctx, 400, bad.error);
    return run(ctx, () => step(ref), failMessage);
  };

export default {
  submitReview: emptyBodyHandler(submitForReview, 'Submitting failed.'),
  withdrawReview: emptyBodyHandler(withdrawFromReview, 'Withdrawing failed.'),

  async sendFeedback(ctx) {
    const ref = parseDraftRef(ctx.params.id);
    if (!ref) return fail(ctx, 404, DRAFT_GONE_MESSAGE);
    const body = parseReviewBody(ctx.request.body, ['reviewerId', 'summaryNote']);
    if ('error' in body) return fail(ctx, 400, body.error as string);
    const note = body.summaryNote;
    if (
      note !== undefined &&
      note !== null &&
      (typeof note !== 'string' || note.length > MAX_NOTE)
    ) {
      return fail(ctx, 400, `summaryNote must be text of at most ${MAX_NOTE} characters`);
    }
    return run(
      ctx,
      () =>
        sendFeedback(ref, {
          reviewerId: body.reviewerId as number,
          summaryNote: note as string | null | undefined,
        }),
      'Sending feedback failed.',
    );
  },

  async publishReview(ctx) {
    const ref = parseDraftRef(ctx.params.id);
    if (!ref) return fail(ctx, 404, DRAFT_GONE_MESSAGE);
    const body = parseReviewBody(ctx.request.body, [
      'reviewerId',
      'originalDropletId',
    ]);
    if ('error' in body) return fail(ctx, 400, body.error as string);
    const original = body.originalDropletId;
    if (original !== null && (typeof original !== 'number' || !isRowId(original))) {
      return fail(ctx, 400, 'originalDropletId must be a positive integer or null');
    }
    return run(
      ctx,
      () =>
        publishWithReview({
          draft: ref,
          reviewerId: body.reviewerId as number,
          originalDropletId: original as number | null,
        }),
      'Publishing failed.',
    );
  },

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
        return fail(
          ctx,
          400,
          `Publishing failed (${validationMessage(err)}). Nothing was changed.`,
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
