import {
  BadgeError,
  MAX_META,
  MAX_OPTIONS,
  MAX_PICKED_LOOKUP,
  MAX_SVG,
  MAX_TITLE,
  getBadgeOptions,
  getPickedBadges,
  looksLikeSvg,
  pickBadge,
  saveBadgeOptions,
  type BadgeOptionInput,
} from '../../../lib/droplet-badges';
import { fail, isRowId, isText, parseBody } from '../../../lib/route-body';

const OPTION_KEYS = ['title', 'emblemSvg', 'model', 'promptVersion'];

/** An error message for the first bad option, otherwise null. */
function optionError(option: unknown): string | null {
  if (option === null || typeof option !== 'object' || Array.isArray(option)) {
    return 'options must hold objects';
  }
  const record = option as Record<string, unknown>;
  const extra = Object.keys(record).find((key) => !OPTION_KEYS.includes(key));
  if (extra) return `Invalid option key ${extra}`;
  if (!isText(record.title, MAX_TITLE)) return `title must be 1 to ${MAX_TITLE} characters`;
  if (!isText(record.emblemSvg, MAX_SVG) || !looksLikeSvg(record.emblemSvg)) {
    return `emblemSvg must be an <svg> of at most ${MAX_SVG} characters`;
  }
  for (const key of ['model', 'promptVersion']) {
    if (record[key] !== undefined && !isText(record[key], MAX_META)) {
      return `${key} must be 1 to ${MAX_META} characters`;
    }
  }
  return null;
}

/** Only these query keys, each a single string; otherwise an error message. */
function queryError(query: Record<string, unknown>, key: string): string | null {
  const extra = Object.keys(query).find((k) => k !== key);
  if (extra) return `Invalid key ${extra}`;
  if (typeof query[key] !== 'string') return `${key} is required`;
  return null;
}

/** Runs the lib call, answering the status of a BadgeError and a 500 for anything else. */
async function respond(ctx: any, what: string, run: () => Promise<unknown>) {
  try {
    ctx.body = { data: await run() };
  } catch (err) {
    if (err instanceof BadgeError) return fail(ctx, err.status, err.message);
    strapi.log.error(`Failed to ${what}.`, err);
    return fail(ctx, 500, `Failed to ${what}.`);
  }
}

export default {
  async saveOptions(ctx) {
    const parsed = parseBody(ctx.request.body ?? {}, ['dropletId', 'userId', 'options'], ['dropletId', 'userId']);
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    const options = body.options;
    if (!Array.isArray(options) || options.length < 1 || options.length > MAX_OPTIONS) {
      return fail(ctx, 400, `options must hold 1 to ${MAX_OPTIONS} options`);
    }
    for (const option of options) {
      const error = optionError(option);
      if (error) return fail(ctx, 400, error);
    }
    return respond(ctx, 'save badge options', () =>
      saveBadgeOptions({
        dropletId: body.dropletId as number,
        userId: body.userId as number,
        options: options as BadgeOptionInput[],
      }),
    );
  },

  async pick(ctx) {
    const parsed = parseBody(
      ctx.request.body ?? {},
      ['dropletId', 'optionId', 'userId'],
      ['dropletId', 'optionId', 'userId'],
    );
    if ('invalid' in parsed) return fail(ctx, 400, parsed.invalid);
    const { body } = parsed;
    return respond(ctx, 'pick the badge', () =>
      pickBadge({ dropletId: body.dropletId as number, optionId: body.optionId as number }),
    );
  },

  async picked(ctx) {
    const error = queryError(ctx.query ?? {}, 'dropletIds');
    if (error) return fail(ctx, 400, error);
    const parts = (ctx.query.dropletIds as string).split(',');
    const ids = parts.map((part) => (/^\d{1,10}$/.test(part) ? Number(part) : NaN));
    if (parts.length > MAX_PICKED_LOOKUP || !ids.every(isRowId)) {
      return fail(ctx, 400, `dropletIds must be 1 to ${MAX_PICKED_LOOKUP} positive integers`);
    }
    return respond(ctx, 'read picked badges', () => getPickedBadges(ids));
  },

  async options(ctx) {
    const error = queryError(ctx.query ?? {}, 'dropletId');
    if (error) return fail(ctx, 400, error);
    const raw = ctx.query.dropletId as string;
    const id = /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
    if (!isRowId(id)) return fail(ctx, 400, 'dropletId must be a positive integer');
    return respond(ctx, 'read badge options', () => getBadgeOptions(id));
  },
};
