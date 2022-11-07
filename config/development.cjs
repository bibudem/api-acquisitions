module.exports = {
	apiBaseUrl: 'https://api.bib.umontreal.ca/acquisitions-dev/',
	log: {
		level: 'debug'
	},
	mongoDBOptions: {
		reconnectTries: 60,
		reconnectInterval: 1000
	},
	/* Routes en format tableau - pour la documentation */
	afficheRoutes: true,
};