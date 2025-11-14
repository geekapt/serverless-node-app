const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'YOUR_URL',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/new' // Rewrite path to match your API Gateway stage
      },
      headers: {
        'x-api-key': 'YOUR_API_KEY',
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
