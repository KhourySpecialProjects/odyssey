import { coCompletionPairs } from '../../../lib/co-completion';
import { fail } from '../../../lib/route-body';

// Co-completion counts (ODY-962): aggregates only, the query string is ignored.
export default {
  async coCompletion(ctx) {
    try {
      const start = Date.now();
      const pairs = await coCompletionPairs();
      ctx.body = { data: { pairs } };
      strapi.log.info(`co-completion: ${pairs.length} pairs in ${Date.now() - start} ms`);
    } catch (err) {
      strapi.log.error('Failed to count co-completions.', err);
      return fail(ctx, 500, 'Failed to count co-completions.');
    }
  },
};
