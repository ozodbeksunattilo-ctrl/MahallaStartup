import path from 'node:path';
import express, { type Express } from 'express';
import { buildContract, LIVE_SERVERS } from './contract';
import type { Deps } from './core/deps';

/** Faqat kerakli Swagger UI fayllari ochiladi (paketning qolgan fayllari emas). */
const ASSETS = new Set(['swagger-ui.css', 'swagger-ui-bundle.js', 'favicon-32x32.png', 'favicon-16x16.png']);

const HTML = `<!doctype html>
<html lang="uz">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mahalladosh API</title>
    <link rel="icon" href="/api/docs/assets/favicon-32x32.png" />
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
    <style>body { margin: 0 } .swagger-ui .topbar { display: none }</style>
  </head>
  <body>
    <div id="ui"></div>
    <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
    <script src="/api/docs/init.js"></script>
  </body>
</html>`;

const INIT = `window.ui = SwaggerUIBundle({
  url: '/api/openapi.json',
  dom_id: '#ui',
  deepLinking: true,
  persistAuthorization: true,
  tryItOutEnabled: true,
  filter: true,
  displayRequestDuration: true,
  docExpansion: 'list',
  defaultModelsExpandDepth: 0,
  presets: [SwaggerUIBundle.presets.apis],
});`;

/**
 * Swagger UI: `GET /api/docs` (internetsiz ishlaydi: fayllar `swagger-ui-dist` dan lokal beriladi),
 * hujjat — `GET /api/openapi.json`. Production'da ham ochiq (mobil/admin ishlab chiquvchilar uchun);
 * `API_DOCS=false` bilan o'chiriladi.
 */
export function mountDocs(app: Express, deps: Pick<Deps, 'env'>): void {
  if (!deps.env.API_DOCS) return;
  const dist = path.dirname(require.resolve('swagger-ui-dist/package.json'));
  let doc: unknown;

  app.get('/api/openapi.json', (_req, res) => {
    doc ??= buildContract(LIVE_SERVERS);
    res.json(doc);
  });
  app.use(
    '/api/docs/assets',
    (req, res, next) => (ASSETS.has(req.path.slice(1)) ? next() : void res.status(404).end()),
    express.static(dist, { index: false, maxAge: '1h' }),
  );
  app.get('/api/docs/init.js', (_req, res) => {
    res.type('js').send(INIT);
  });
  app.get(['/api/docs', '/api/docs/'], (_req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'",
    );
    res.type('html').send(HTML);
  });
}
