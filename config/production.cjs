module.exports = {
	apiBaseUrl: 'https://api.bib.umontreal.ca/acquisitions/',
	ssh: false,
	log: {
		level: 'log'
	},
	configLogPourVisualiserObjets: {
		strategy: 'console',
		setting: {
			level: 'info',
			format: '{{timestamp}} <{{title}}> {{message}}',
			dateformat: 'HH:MM:ss.L',
			inspectOpt: {
				showHidden: true, //the object's non-enumerable properties will be shown too
				depth: null
			}
		}
	},
	configLogPourDeboggage: {
		strategy: 'console',
		setting: {
			level: 'debug',
			format: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})',
			dateformat: 'HH:MM:ss.L',
			inspectOpt: {
				showHidden: true, //the object's non-enumerable properties will be shown too
				depth: null
			}
		}
	}
};
