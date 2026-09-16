/**
 * Relative on purpose: the API is always served from the same origin as the app.
 *   - Docker / production: nginx proxies /api to the backend (frontend/nginx/default.conf).
 *   - ng serve: proxy.conf.json forwards /api to http://localhost:3000.
 * One origin means no CORS, and the same build works on any host name.
 */
export const API_BASE = '/api';
