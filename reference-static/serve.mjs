import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mimeTypes = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };

function safePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  const normalized = normalize(pathname).replace(/^([.][.][/\\])+/, '');
  return join(root, normalized);
}

const server = createServer(async (req, res) => {
  try {
    let filePath = safePath(req.url || '/');
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      filePath = join(root, 'index.html');
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Server error: ${error.message}`);
  }
});

server.listen(port, () => console.log(`NOCTRA storefront running at http://localhost:${port}`));
