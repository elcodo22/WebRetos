@AGENTS.md

## Instrucciones para el agente

- Responde siempre en español.
- No hagas commits, pushes ni PRs salvo que lo pida explícitamente.
- Antes de tocar APIs de Next.js 16, revisa `node_modules/next/dist/docs/`.
- Este proyecto usa `proxy.ts`, nunca `middleware.ts`.
- No importes `lib/supabase/server.ts` en Client Components.
- No simplifiques la estética CRT: mantén scanlines, cursores custom y fondo `#006eff`.
- Usa Server Components por defecto; solo añade `"use client"` cuando sea necesario.
- Server Actions devuelven `{ error?, success? }` — respeta ese patrón.
- Nombres de dominio en español (`reto`, `obra`, `perfil`), términos técnicos en inglés.
- Si un cambio afecta rutas, tablas, env vars o flujos, actualiza `AGENTS.md`.
