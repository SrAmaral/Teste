import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import express, { type Router } from 'express';

/**
 * Em produção (container único) a API também serve os builds dos front-ends na mesma origem:
 *   /                → shell
 *   /mfe-carteiras/  → remote de carteiras
 *   /mfe-acoes/      → remote de ações
 * Rotas do Angular sem extensão (ex.: /carteiras/1) caem no index.html do shell.
 */
export function rotasWeb(pastaWeb: string): Router {
  const router = express.Router();
  // manifest, remoteEntry.json e index.html mudam a cada deploy; o resto tem hash no nome.
  const semCache = (res: express.Response, caminho: string) => {
    if (['.html', '.json'].includes(extname(caminho))) res.setHeader('Cache-Control', 'no-cache');
  };

  for (const remote of ['mfe-carteiras', 'mfe-acoes']) {
    router.use(`/${remote}`, express.static(join(pastaWeb, remote), { index: false, setHeaders: semCache }));
  }
  router.use(express.static(join(pastaWeb, 'shell'), { setHeaders: semCache }));

  const indexShell = join(pastaWeb, 'shell', 'index.html');
  router.get(/^(?!\/api(\/|$)).*/, (req, res, next) => {
    if (extname(req.path) || !existsSync(indexShell)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexShell);
  });
  return router;
}
