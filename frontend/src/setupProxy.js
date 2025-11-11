const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://j0d2n7xp58.execute-api.us-east-2.amazonaws.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/new' // Rewrite path to match your API Gateway stage
      },
      headers: {
        'x-api-key': '1LhXxfDwRZ3xE8b6P4omjacqEDlQOCje95QXBTuJ',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      secure: false, // Only for development with self-signed certificates
      logLevel: 'debug',
      onProxyReq: (proxyReq) => {
        // Log the request for debugging
        console.log('Proxying request to:', proxyReq.path);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
      }
    })
  );
};
