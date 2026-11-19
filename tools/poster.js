// Usage: node tools/poster.js '{"headline":"...","subline":"...","cta":"...","theme":"dark|light|indigo"}' assets/posters/name.png
// V (assets/v/v-face.png) is drawn on every poster. Renders a 1080x1350 poster with the OFFICIAL logo file (never drawn). Needs playwright (global install ok).
const path = require("path"), fs = require("fs"), http = require("http");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
(async () => {
  const spec = JSON.parse(process.argv[2]), out = process.argv[3];
  const root = path.resolve(__dirname, "..");
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" };
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html")); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0);
  const base = "http://localhost:" + srv.address().port;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 1400 } });
  await p.goto(base + "/index.html#/studio"); await p.waitForTimeout(300);
  const png = await p.evaluate(async (s) => { // reuse the in-site renderer through a hidden canvas
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350; await window.VCAI.drawPoster(cv, s); return cv.toDataURL("image/png"); }, spec);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(png.split(",")[1], "base64")); await b.close(); srv.close(); console.log("wrote", out);
})();
