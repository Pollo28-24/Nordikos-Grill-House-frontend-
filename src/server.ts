import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

// Parse JSON bodies for API routes
app.use(express.json({ limit: '1mb' }));


/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) return next();
      
      // Inject environment variables into the HTML for the client
      const html = await response.text();
      const env = {
        supabaseUrl: process.env['SUPABASE_URL'] || '',
        supabaseKey: process.env['SUPABASE_KEY'] || '',
        encryptionKey: process.env['ENCRYPTION_KEY'] || '',
        encryptionIV: process.env['ENCRYPTION_IV'] || '',
      };
      
      const envScript = `<script>window.__ENV__ = ${JSON.stringify(env)};</script>`;
      const injectedHtml = html.replace('</head>', `${envScript}</head>`);
      
      // We need to rebuild the response headers and status
      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.send(injectedHtml);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

// Prerender params for dynamic routes (limit to safe samples)
export function getPrerenderParams() {
  return {
    routes: {
      'manage-products/edit/:id': [{ id: 'sample' }]
    }
  };
}
