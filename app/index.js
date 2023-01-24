import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import webLogger from '@remillc/web-logger'
import config from 'config'
import { initializeApi } from './api.js'
import { defaultJSONHandler } from './middlewares/error.middleware.js'

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(bodyParser.json());
app.use(webLogger({
  logDirectory: config.get('log.dir')
}));

app.use(`/`, express.static(fileURLToPath(new URL('./public', import.meta.url))));

initializeApi(app)

app.use(defaultJSONHandler)

app.listen(config.get('server.port'), function (err) {
  if (err) throw err;
  console.log('Server running at http://localhost:' + config.get('server.port') + ' in ' + process.env.NODE_ENV + ' mode');
});

export default app
