import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import chalk from 'chalk'
import webLogger from '@remillc/web-logger'
import config from 'config'
import { initializeApi } from './api.js'
import { apiDocRouter } from './controllers/api-doc.controller.js'
import { defaultJSONHandler } from './middlewares/error.middleware.js'

const app = express();

app.set('port', config.get('server.port'))
app.disable('x-powered-by');

app.use(cors());
app.use(bodyParser.json());
app.use(webLogger({
  logDirectory: config.get('log.dir')
}));

app.use(apiDocRouter)

initializeApi(app)

app.use(defaultJSONHandler)

/**
 * Start Express server.
 */

app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
});

export default app
