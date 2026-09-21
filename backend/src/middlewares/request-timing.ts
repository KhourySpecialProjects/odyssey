/**
 * Logs per-request timing for the Strapi REST API.
 *
 * The frontend probe measures Strapi calls from the *outside* (network time
 * included). This measures them from the inside, so the difference between the
 * two tells you how much of the latency is Strapi/DB work versus transport.
 *
 * Opt-in via PERF_PROBE=1 in the backend environment. Registered in
 * config/middlewares.ts.
 */

export default (_config, { strapi }) => {
  const enabled = process.env.PERF_PROBE === "1";

  return async (ctx, next) => {
    if (!enabled || !ctx.request.url.startsWith("/api/")) {
      return next();
    }

    const start = process.hrtime.bigint();
    await next();
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    // ctx.length is only set for buffered bodies; fall back to measuring the
    // serialised body so streamed/large responses still report a size.
    const bytes =
      ctx.length ??
      (ctx.body ? Buffer.byteLength(JSON.stringify(ctx.body), "utf8") : 0);

    // Query string length is a useful proxy for populate depth when
    // correlating slow requests back to a callsite in lib/requests/.
    const queryLength = (ctx.request.url.split("?")[1] ?? "").length;

    strapi.log.info(
      `[perf] ${ms.toFixed(1)}ms ${(bytes / 1024).toFixed(1)}KB ` +
        `${ctx.status} ${ctx.request.method} ${ctx.request.path} q=${queryLength}`,
    );
  };
};
