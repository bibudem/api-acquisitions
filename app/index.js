import express from 'express'
import webLogger from '@remillc/web-logger'
import expressMongoDb from 'express-mongo-db'
import nodeGlobalProxy from 'node-global-proxy'
import bodyParser from 'body-parser'
import errorHandler from 'errorhandler'
import debugFactory from 'debug'
import config from 'config'

import routes from './routes/index.js'
import listeRoutes from './lib/list-routes.js'
import console from './lib/console.js'

const proxy = nodeGlobalProxy.default

// Setting up proxy if needed

if (config.get('httpClient.proxy')) {

  console.debug('Using proxy settings')

  proxy.setConfig(config.get('httpClient.proxy'))
  proxy.start()

}

const debug = debugFactory('gs:app')
const app = express();

app.disable('x-powered-by');

app.use(webLogger({
  logDirectory: config.get('log.dir')
}));

if (process.env.NODE_ENV !== 'production') {
  app.use(function (req, res, next) {
    console.log(req.url)
    next();
  })
}

if (process.env.NODE_ENV === 'production') {
  // traitement d'erreur en production
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);

  });
} else {
  // traitement d'erreur en développement
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err

    });

  });
  debug('listening');
}

// development only
if ('development' === app.get('env')) {
  app.use(errorHandler());
  // pretty print pour json
  app.set('json spaces', 2);
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(`/`, express.static('public'));

//Get db connection in request object
app.use(expressMongoDb(config.get('mongoDBUrl'), config.get('mongoDBOptions')));

app.use(routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found: ');
  console.log(req.originalUrl);
  err.status = 404;
  next(err);
});

//Express application will listen to port mentioned in our configuration
app.listen(config.get('server.port'), function (err) {
  if (err) throw err;
  console.log('Server running at http://localhost:' + config.get('server.port') + ' in ' + process.env.NODE_ENV + ' mode');

  // Pour afficher les routes en forme de tableau
  if (config.afficheRoutes) {
    listeRoutes(``, routes.stack);
  }
});

export default app
