import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import webLogger from '@remillc/web-logger'
import config from 'config'
import { initializeApi } from './api.js'

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(bodyParser.json());
app.use(webLogger({
  logDirectory: config.get('log.dir')
}));

app.use(`/`, express.static('public'));

initializeApi(app)

app.listen(config.get('server.port'), function (err) {
  if (err) throw err;
  console.log('Server running at http://localhost:' + config.get('server.port') + ' in ' + process.env.NODE_ENV + ' mode');
});

export default app
