import _ from 'lodash'
import debugFactory from 'debug'
import config from 'config'

import { all, allFromDateNouveaute, allInBib, allInBibFromDateNouveaute, allInDiscipline, allInDisciplineFromDateNouveaute } from '../models/nacq-old.js'
import { getBibName, getDisciplineName, format, sendResults, sendXMLResults, formatUrlCampagneGAPage, formatUrlCampagneGARSS } from '../lib/commons.js'
import messages from '../../config/messages.js'
import console from '../lib/console.js'

const debug = debugFactory('nacq:controller:nacq')

export async function GetNacqs(req, res) {
	let periode = req.query.periode
	let nacqs
	if (periode && periode.match(/[0-9]{2}/)) {
		debug(periode)
		debug(typeof periode)
		let date = periode2Date(periode)
		nacqs = await allFromDateNouveaute(date)

	} else {
		nacqs = await all()
	} const limite = req.query.limite
	nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
	sendResults(req.originalUrl, res, nacqs);
}

export async function GetNacqsRSS(req, res) {
	console.log(req.params)
	let periode = req.query.periode
	let nacqs
	if (periode && periode.match(/[0-9]{2}/)) {
		debug(periode)
		debug(typeof periode)
		let date = periode2Date(periode)
		nacqs = await allFromDateNouveaute(date)

	} else {
		nacqs = await all()
	}
	const limite = req.query.limite
	nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
	sendXMLResults(req.originalUrl, res, config.get('rss.title'), nacqs)
}

export async function GetNacqsInBib(req, res) {
	let periode = req.query.periode
	let nacqs
	if (periode && periode.match(/[0-9]{2}/)) {
		debug(periode)
		debug(typeof periode)
		let date = periode2Date(periode)
		nacqs = await allInBibFromDateNouveaute(req.params.bib, date)

	} else {
		nacqs = await allInBib(req.params.bib)
	}
	const limite = req.query.limite
	nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
	for (let i = 0; i < nacqs.length; i++) {
		nacqs[i] = formatUrlCampagneGAPage(nacqs[i], req.params.bib)
	}
	nacqs = nacqs.map(format)
	sendResults(req.originalUrl, res, nacqs);
}

export async function GetNacqsRSSInBib(req, res) {
	let periode = req.query.periode
	let nacqs
	if (periode && periode.match(/[0-9]{2}/)) {
		debug(periode)
		debug(typeof periode)
		let date = periode2Date(periode)
		nacqs = await allInBibFromDateNouveaute(req.params.bib, date)

	} else {
		nacqs = await allInBib(req.params.bib)
	}
	const limite = req.query.limite
	nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
	for (let i = 0; i < nacqs.length; i++) {
		nacqs[i] = formatUrlCampagneGARSS(nacqs[i], req.params.bib)
	}
	nacqs = nacqs.map(format)
	let title = getBibName(req.params.bib) + " - Nouveautés" + config.get('rss.title');
	sendXMLResults(req.originalUrl, res, title, nacqs)
}

export async function GetNacqsInDiscipline(req, res) {
	try {
		let periode = req.query.periode
		let nacqs
		if (periode && periode.match(/^[0-9]{1,2}$/)) {
			console.log("periode valide")
			debug(periode)
			debug(typeof periode)
			let date = periode2Date(periode)
			console.log(date)
			nacqs = await allInDisciplineFromDateNouveaute(req.params.discipline, date)

		} else {
			nacqs = await allInDiscipline(req.params.discipline)
		}
		const limite = req.query.limite
		nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
		nacqs = nacqs.map(format)
		sendResults(req.originalUrl, res, nacqs);
	} catch (e) {
		console.error(new Date().toISOString() + " - " + "Erreur function GetNacqsInDiscipline " + req.params.discipline)
		console.error(new Date().toISOString() + " - ", e)
		return { msg: messages.get("ERREUR") }
	}
}

export async function GetNacqsRSSInDiscipline(req, res) {
	try {
		let periode = req.query.periode
		let nacqs
		if (periode && periode.match(/[0-9]{2}/)) {
			debug(periode)
			debug(typeof periode)
			let date = periode2Date(periode)
			nacqs = await allInDisciplineFromDateNouveaute(req.params.discipline, date)

		} else {
			nacqs = await allInDiscipline(req.params.discipline)
		}
		const limite = req.query.limite
		nacqs = (limite && limite.match(/^[0-9]+$/) && (nacqs.length > limite)) ? nacqs.slice(0, limite) : nacqs
		for (let i = 0; i < nacqs.length; i++) {
			nacqs[i] = formatUrlCampagneGARSS(nacqs[i], req.params.discipline)
		}
		nacqs = nacqs.map(format)
		let title = "Nouveautés en " + getDisciplineName(req.params.discipline) + config.get('rss.title');
		sendXMLResults(req.originalUrl, res, title, nacqs)
	} catch (e) {
		console.error(new Date().toISOString() + " - " + "Erreur function GetNacqsRSSInDiscipline " + req.params.discipline)
		console.error(new Date().toISOString() + " - ", e)
		return { msg: messages.get("ERREUR") }
	}
}

export function periode2Date(periode) {
	let d = new Date();
	d.setDate(d.getDate() - periode);
	return d.toISOString().split('T')[0]
}