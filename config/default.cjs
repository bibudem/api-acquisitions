const { join } = require('path')

const disciplines = require('./champs-disciplinaires')
const disciplinesByCreator = require('./disciplines-by-creator')

const locale = 'fr-CA'

module.exports = {
	disciplines,
	apiBaseUrl: 'https://api.bib.umontreal.ca/acquisitions',
	urlPermalienCatalogue: 'https://umontreal.on.worldcat.org/oclc/',
	oclcNumbersFilePath: join(__dirname, '..', 'data', 'nacq_global'),
	locale,
	timeZone: 'America/Toronto',
	nacqsTtl: 120,
	log: {
		dir: 'logs',
		level: 'info'
	},
	httpClient: {
		proxy: 'http://mandataire.ti.umontreal.ca:80'
	},
	rss: {
		titleSuffix: ' - Bibliothèques / UdeM',
		headers: {
			site_url: 'https://bib.umontreal.ca',
			image_url: 'https://bib.umontreal.ca/typo3conf/ext/udem_bib/Resources/Public/Images/logo-bib.svg',
			copyright: 'Copyright : Direction des bibliothèques / Université de Montréal',
			language: locale,
			ttl: '1440' // 24 heures avant de besoin de refraichir
		},
		analytics: {
			utm_campaign: 'Nouveautés',
			utm_medium: 'fil rss',
			utm_source: '%s'
		},
	},
	oclcApi: {
		auth: {
			tokenTrials: 5,
			tokenTrialsInterval: 1500,
			useCache: true
		},
	},
	disciplinesByCreator,
}