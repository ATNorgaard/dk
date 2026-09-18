import type { Instrumentation } from "next";

/**
 * Error tracking without a third-party service: every uncaught server error
 * (pages, route handlers, server actions, proxy) is written to the runtime
 * log as one JSON line, so Vercel's log view and any log drain can filter on
 * "level":"error" and group on the digest. If a hosted tracker is added
 * later, this is the one place to send it from.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as { message?: string; digest?: string; stack?: string };
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      message: e?.message ?? String(err),
      digest: e?.digest ?? null,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource ?? null,
      stack: e?.stack?.split("\n").slice(0, 6).join(" | ") ?? null,
    }),
  );
};
