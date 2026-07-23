// OWNER: PERSONAL-OS (app shim endpoint)
// File: src/services/templates-api.js
// Purpose: Simple server-side handlers for reading and writing Realtor OS templates.

import fs from 'fs';
import path from 'path';

const base = path.resolve(process.cwd(), 'packages/realtor-os/templates');

export const handler = async (event) => {
  const { httpMethod, queryStringParameters } = event;
  try {
    if (httpMethod === 'GET' && event.path.endsWith('/templates/list')) {
      const files = fs.readdirSync(base).flatMap(dir => {
        const p = path.join(base, dir);
        if (fs.statSync(p).isDirectory()) {
          return fs.readdirSync(p).map(f => `${dir}/${f}`);
        }
        return dir;
      });
      return { statusCode: 200, body: JSON.stringify(files) };
    }
    if (httpMethod === 'GET' && event.path.endsWith('/templates/get')) {
      const p = queryStringParameters?.path;
      if (!p) return { statusCode: 400, body: 'Missing path' };
      const full = path.join(base, p);
      if (!fs.existsSync(full)) return { statusCode: 404, body: 'Not found' };
      const content = fs.readFileSync(full, 'utf8');
      return { statusCode: 200, body: content };
    }
    if (httpMethod === 'POST' && event.path.endsWith('/templates/save')) {
      const body = JSON.parse(event.body || '{}');
      const { path: p, content } = body;
      if (!p) return { statusCode: 400, body: 'Missing path' };
      const full = path.join(base, p);
      fs.writeFileSync(full, content, 'utf8');
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
};
