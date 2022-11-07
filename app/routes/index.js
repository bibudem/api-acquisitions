import { dirname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import debugFactory from 'debug'
import express from 'express'
import config from 'config'
import { GetNacqs, GetNacqsInBib, GetNacqsInDiscipline, GetNacqsRSSInBib, GetNacqsRSSInDiscipline } from '../controllers/nacq.controller.js'
import console from '../lib/console.js'

const debug = debugFactory('gs:routes:index')
const pkg = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json')))

const router = express.Router();

/**
 *  Cross-Origin Resource Sharing (CORS) support.
 *  Cors is a mechanism that allows many resources (e.g. fonts, JavaScript, etc.) on a web page to be requested from another domain outside the domain the resource originated from.
 */

router.all('*', function (req, res, next) {
	if (!req.get('Origin')) {
		return next();
	}
	// use "*" here to accept any origin
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'GET');
	res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
	res.set('Vary', 'Origin')
	if ('OPTIONS' === req.method) {
		return res.sendStatus(200);
	}
	next();
})

router.all('*', function (req, res, next) {
	/* S'il y a un paramètre dans l'url qui détérmine le cache, on l'utilise
		 au détriment de la valeur dans config.cache */
	if (req.query.cache !== undefined) {
		config.cache = (req.query.cache === 'true');
	}
	next();

})

router.get('/about', function (req, res) {
	res.send(`API ${pkg.name} v${pkg.version} (${process.env.NODE_ENV})`);
})

router.get('*', function (req, res, next) {
	res.set('Content-Type', 'application/json');
	next();
})

// Routes

/**********************************************************************************
Liste de bibliothèques et de champs disciplinaires
************************************************************************************/

router.get('/liste/bibs', function (req, res) {
	res.send(config.get('BIBS'))
})

router.get('/liste/disciplines', function (req, res) {
	res.send(config.get('DISCIPLINES'))
})


/**********************************************************************************
Nouvelles acquisitions
************************************************************************************/

/* GET - RSS   de toutes les  nouvelles acquistions d'une bibliotheque */
router.get('/bib/:bib.rss', function (req, res) {
	res.set('Content-Type', 'application/rss+xml');
	GetNacqsRSSInBib(req, res)
})

/* GET - liste de toutes les  nouvelles acquistions d'une bibliotheque  */
router.get('/bib/:bib', GetNacqsInBib);

/* GET - RSS  de toutes les nouvelles acquistions d'une discipline  */
router.get('/discipline/:discipline.rss', function (req, res) {
	res.set('Content-Type', 'application/rss+xml');
	GetNacqsRSSInDiscipline(req, res)
})

/* GET - liste de toutes les nouvelles acquistions d'une discipline  */
router.get('/discipline/:discipline', GetNacqsInDiscipline);

/* GET - liste de toutes les nouvelles acquistions de toutes les bibliothèques dans toutes les disciplines  */
router.get('/', GetNacqs);

export default router;
