const { join } = require('path')

const BIBS = require('code-bib')

const LANGCODES = require('./langues-code-table')
const DISCIPLINES = require('./champs-disciplinaires')
const disciplinesByCreator = require('./disciplines-by-creator')

module.exports = {
	disciplinesByCreator,
	nacqsTtl: 120,
	urlBib: 'https://bib.umontreal.ca',
	urlPermalienCatalogue: 'https://umontreal.on.worldcat.org/oclc/',
	log: {
		dir: 'logs',
		level: 'debug'
	},
	// Pour éviter l'erreur 'MongoError: Topology was destroyed'
	mongoDBOptions: {
		reconnectTries: 100, // défaut 5
		reconnectInterval: 10000 // défaut 5000
	},
	oclcAPI: {
		useCache: true
	},
	httpClient: {
		proxy: 'http://mandataire.ti.umontreal.ca:80',
		timeout: 30000
	},
	oclcAuth: {
		tokenTrials: 5,
		tokenTrialsInterval: 1500
	},
	oclcNumbersFilePath: join(__dirname, '..', 'data', 'nacq_global'),
	httpstatus: {
		OK: 200,
		NOTFOUND: 404,
		SERVERERROR: 500,
		UNPROCESSABLEENTITY: 422,
		NOTAUTHORIZED: 403
	},
	/* Routes en format tableau - pour la documentation */
	afficheRoutes: false,
	syndeticsApi: {
		url: 'https://syndetics.com/index.aspx?isbn=',
		params: '/SC.JPG'
	},
	amazonBooksApi: {
		url: 'http://images.amazon.com/images/P/',
		taille: 'SCTHUMBZZZ'  // petite 75px, SCMZZZZZZZ = Moyen 160 px, SCLZZZZZZZ = Grande  500 px

	},
	openLibraryCoversApi: {
		url: 'http://covers.openlibrary.org/b/isbn/',
		params: '-S.jpg'
	},
	rss: {
		title: ' - Bibliothèques - Université de Montréal',
		feed_url: 'https://bib.umontreal.ca/rss',
		site_url: 'https://bib.umontreal.ca',
		image_url: 'https://bib.umontreal.ca/typo3conf/ext/udem_bib/Resources/Public/Images/logo-bib.svg',
		copyright: 'Copyright : Direction des bibliothèques - Université de Montréal',
		language: 'fr-CA',
		ttl: '1440' // 24 heures avant de besoin de refraichir
	},
	google_analytics: {
		campagne: '?utm_campaign=Nouveaut%C3%A9s',
		mediumpage: '&utm_medium=page%20nouveaut%C3%A9s',
		mediumrss: '&utm_medium=fil%20rss',
		source: '&utm_source='
	},
	BIBS: BIBS,
	DISCIPLINES: DISCIPLINES,
	PRIMO_LANGUAGES_CODE: LANGCODES
}