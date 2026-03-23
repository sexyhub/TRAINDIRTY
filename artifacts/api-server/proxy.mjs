import http from "node:http";

const TARGET_PORT = 19273;
const LISTEN_PORT = Number(process.env.PORT ?? 8080);

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Bad Gateway");
  });

  req.pipe(proxy, { end: true });
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`API proxy running on port ${LISTEN_PORT} → ${TARGET_PORT}`);
});
