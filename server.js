// Zero-dependency local server: node server.js  ->  http://localhost:3000
// Serves the site and /api/claude (same function Vercel uses). Optional: ANTHROPIC_API_KEY=... node server.js
const http = require("http"), fs = require("fs"), path = require("path");
const claude = require("./api/claude.js");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon" };
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/api/claude") {
    let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => {
      req.body = raw;
      res.status = (c) => ((res.statusCode = c), res);
      res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
      claude(req, res);
    });
    return;
  }
  const f = path.join(__dirname, url === "/" ? "index.html" : url);
  if (!f.startsWith(__dirname) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`vcreate Studio running at ${url}`);
  if (process.env.NO_OPEN) return; // opens your browser automatically
  const { exec } = require("child_process");
  exec(process.platform === "win32" ? `start "" ${url}` : process.platform === "darwin" ? `open ${url}` : `xdg-open ${url}`, () => {});
});
