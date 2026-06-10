const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let mainWindow;

// A simple HTTP server to serve dist/ files with COOP/COEP headers
function startServer() {
  server = http.createServer((req, res) => {
    // Decode URI to handle spaces/special characters in file paths
    let relativePath = decodeURIComponent(req.url.split('?')[0]);
    if (relativePath === '/' || relativePath === '') {
      relativePath = '/index.html';
    }
    
    const filePath = path.join(__dirname, 'dist', relativePath);

    // Determine content type
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js' || ext === '.mjs') contentType = 'text/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.wasm') contentType = 'application/wasm';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.ico') contentType = 'image/x-icon';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }
      
      // Send security headers for SharedArrayBuffer / WebAssembly support
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });

  // Listen on a local loopback port
  server.listen(59123, '127.0.0.1', () => {
    console.log('Server running on http://127.0.0.1:59123');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "VidZone",
    autoHideMenuBar: true, // Clean desktop app layout
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://127.0.0.1:59123');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (server) {
    server.close();
  }
});
