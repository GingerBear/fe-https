// {{https inject START}}

app.httpsServer = require('https').createServer({
  key: require('fs').readFileSync('ssl-key.pem'),
  cert: require('fs').readFileSync('ssl-cert.pem')
}, app).listen('443');

// {{https inject END}}