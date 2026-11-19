// 로컬 확인용 정적 파일 서버 (Node 내장 모듈만 사용, 설치할 것 없음)
//
// 사용법:
//   node serve.js          → http://localhost:8000
//   node serve.js 3000     → http://localhost:3000
//
// 블로그 자체는 이 파일 없이도 동작한다. GitHub Pages 같은 정적 호스팅에 올릴 때는 필요 없다.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad Request');
    return;
  }

  let file = path.resolve(ROOT, '.' + urlPath);

  // 프로젝트 폴더 밖의 파일은 보여주지 않는다.
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(file, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) file = path.join(file, 'index.html');

    fs.readFile(file, (err, data) => {
      if (err) {
        send(res, 404, 'Not Found');
        console.log(`404 ${urlPath}`);
        return;
      }
      send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
      console.log(`200 ${urlPath}`);
    });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`${PORT}번 포트를 이미 쓰고 있어요. 다른 포트로 실행해 보세요: node serve.js 3000`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`블로그 실행 중: http://localhost:${PORT}  (끄려면 Ctrl+C)`);
});
