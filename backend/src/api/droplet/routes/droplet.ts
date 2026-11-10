/**
 * droplet router
 */

import { factories } from '@strapi/strapi';

// inReview changes only through the review routes, which write in-process.
const rejectInReview = async (ctx: any, next: () => Promise<unknown>) => {
  const data = ctx.request.body?.data;
  if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'inReview')) {
    ctx.status = 400;
    ctx.body = {
      data: null,
      error: {
        status: 400,
        name: 'BadRequestError',
        message: 'inReview can only change through the review routes.',
        details: {},
      },
    };
    return;
  }
  return next();
};

export default factories.createCoreRouter('api::droplet.droplet', {
  config: { update: { middlewares: [rejectInReview] } },
});
