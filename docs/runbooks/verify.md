# Verification recipes that worked

- Build/type/lint: `pnpm typecheck && pnpm lint && pnpm build` (dev stopped).
- Routes: `curl -sI localhost:3000/` → 307 to `/da`; `/da/domaener/findes-ikke` → 404.
- RLS: with the publishable key, `GET /rest/v1/applications?select=id` returns `[]`; an insert setting `handled_at` returns 401.
- House in the hidden pane: dispatch `new PointerEvent('pointerover', {bubbles:true, composed:true, pointerType:'mouse'})` on `.tuc-hit` inside the shadow root; read `data-state` on `svg[data-domain]` lamps and `section#top[data-level]`.
- Deployment: after `vercel deploy`, `vercel inspect <url> --logs` must show `Detected Next.js version`. "Ready" alone proved nothing once.
- Test rows written to Kim's DB during verification were deleted with the service-role key; keep doing that.
