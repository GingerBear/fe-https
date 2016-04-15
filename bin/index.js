#! /usr/bin/env node

var fs = require('fs');
var projectRoot = process.cwd();
var libServerPath = projectRoot + '/lib/server.js';
var startHttpsPath = __dirname + '/../start-https.js';
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;


main();


function main() {
  defend();
  
  var libServerCode = fs.readFileSync(libServerPath).toString();

  generateSSL(function() {
    var options = getOptions(process.argv);

    injectHttpsCode(libServerPath, libServerCode);
    runServer(options);
  });

  cleanServerOnExit(libServerCode);
}

function runServer(options) {
  console.log('RUN: sudo node app -w 0 --url ' + options.api + ' --stage_url http://localhost-stage:4000 --port 80');
  var c1 = exec('sudo node app -w 0 --url ' + options.api + ' --stage_url http://localhost-stage:4000 --port 80');
  c1.stdout.pipe(process.stdout);
}

function defend() {
  try {
    var libServerCode = fs.readFileSync(libServerPath).toString();
  } catch(e) {
    console.log('ERROR: Looks like you are not under frontend < v1.4 project root directory.');
    process.exit(1);
  }

  if (process.argv[2] === 'clean') {
    try {
      fs.unlinkSync('ssl-key.pem');
      fs.unlinkSync('certrequest.csr');
      fs.unlinkSync('ssl-cert.pem');
    } catch(e) {}
    console.log('RUN: ssl files cleaned');
    process.exit(0);
  }
}

function injectHttpsCode(libServerPath, libServerCode) {
  if (libServerCode.indexOf('require(\'https\').createServer') === -1) {
    fs.writeFileSync(libServerPath, libServerCode.replace('routes.register(app);', 'routes.register(app);' + fs.readFileSync(startHttpsPath)));
  }
}

function getOptions(argv) {
  var options = {
    api: 'http://localhost:4000'
  };

  if (argv[2]) {
    options.api = argv[2];
  }

  return options;
}

function generateSSL(done) {
  if (fs.existsSync('ssl-key.pem') && fs.existsSync('certrequest.csr') && fs.existsSync('ssl-cert.pem')) {
    return done();
  }

  var c1 = spawn('openssl', ['genrsa', '-out', 'ssl-key.pem', '1024'], { stdio: ['pipe', process.stdout, process.stderr] });
  c1.stdin.write('\n\n\n\n\n\n\n\n\n\n\n\n\n');
  c1.on('exit', function() {

    var c2 = spawn('openssl', ['req', '-new', '-key', 'ssl-key.pem', '-out', 'certrequest.csr'], { stdio: ['pipe', process.stdout, process.stderr] });
    c2.stdin.write('\n\n\n\n\n\n\n\n\n\n\n\n\n');
    c2.on('exit', function() {

      var c3 = spawn('openssl', ['x509', '-req', '-in', 'certrequest.csr', '-signkey', 'ssl-key.pem', '-out', 'ssl-cert.pem'], { stdio: ['pipe', process.stdout, process.stderr] });
      c3.stdin.write('\n\n\n\n\n\n\n\n\n\n\n\n\n');
      c3.on('exit', done);

    });
  })
}

function cleanServerOnExit(libServerCode) {
  process.on('exit', clean);
  process.on('SIGINT', clean);
  process.on('uncaughtException', clean);

  function clean() {
    try {
      fs.writeFileSync(libServerPath, libServerCode.replace(/\/\/ \{\{https inject START\}\}[.\s\S]+\/\/ \{\{https inject END\}\}/, ''));
    } catch(e) {}
  }
}
