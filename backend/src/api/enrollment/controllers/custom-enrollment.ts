import { coCompletionPairs, completionCounts } from '../../../lib/co-completion';
import { fail } from '../../../lib/route-body';

// Co-completion counts (ODY-962, ODY-976): aggregates only, the query string is ignored.
export default {
  async coCompletion(ctx) {
    try {
      const start = Date.now();
      const [pairs, completions] = await Promise.all([coCompletionPairs(), completionCounts()]);
      ctx.body = { data: { pairs, completions } };
      strapi.log.info(
        `co-completion: ${pairs.length} pairs, ${completions.length} completions in ${Date.now() - start} ms`,
      );
    } catch (err) {
      strapi.log.error('Failed to count co-completions.', err);
      return fail(ctx, 500, 'Failed to count co-completions.');
    }
  },
};
