import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_jhbuaxkhsfkxyyhnlzlq",
  // "node" (padrão do init) não tem WebSocket nativo, e o cliente admin do Supabase
  // (@supabase/supabase-js) tenta inicializar o Realtime no createClient() mesmo sem usarmos
  // realtime — quebra com "Node.js detected but native WebSocket not found" (visto de verdade
  // rodando em produção). node-22 resolve.
  runtime: "node-22",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
