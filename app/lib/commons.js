import _ from 'lodash'
import tracer from 'tracer'
import RSS from 'rss'
import debugFactory from 'debug'
import config from 'config'
import messages from '../../config/messages.js'

const debug = debugFactory('acquisitions:lib:commons')

const console = tracer[config.configLogPourVisualiserObjets.strategy](config.configLogPourVisualiserObjets.setting)

const BIBS = config.BIBS
const DISCIPLINES = config.DISCIPLINES
const PRIMO_LANGUAGES_CODE = config.PRIMO_LANGUAGES_CODE


export function isSuccess(result) {
	return ((_.has(result, "msg")) && (result.msg === messages.get("SUCCES").key));

}

var accentsTidy = function (s) {
	var r = s.toLowerCase();
	r = r.replace(new RegExp("\\s", 'g'), "");
	r = r.replace(new RegExp("[àáâãäå]", 'g'), "a");
	r = r.replace(new RegExp("æ", 'g'), "ae");
	r = r.replace(new RegExp("ç", 'g'), "c");
	r = r.replace(new RegExp("[èéêë]", 'g'), "e");
	r = r.replace(new RegExp("[ìíîï]", 'g'), "i");
	r = r.replace(new RegExp("ñ", 'g'), "n");
	r = r.replace(new RegExp("[òóôõö]", 'g'), "o");
	r = r.replace(new RegExp("œ", 'g'), "oe");
	r = r.replace(new RegExp("[ùúûü]", 'g'), "u");
	r = r.replace(new RegExp("[ýÿ]", 'g'), "y");
	r = r.replace(new RegExp("\\W", 'g'), "");
	return r;
};

export function getNormalizedName(name) {
	var nameSansEspaces = name.replace(/\s+/g, ''),
		nameMinuscules = nameSansEspaces.toLowerCase(),
		nameSansAccents = accentsTidy(nameMinuscules);
	return nameSansAccents;
}

export function dateWithMoreDays(date, days) {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result.toISOString().slice(0, 10);
}

/* Removing de boilerplate */
export function gslogmessage(message) {
	console.info(__(message));
	return __(message);
}

export function gslog(operation, typeobjet, objet) {
	var message = __(operation);
	message += " - "
	switch (typeobjet) {
		case "nacq":
			message += __("nouvelle-acquisition");
			break;
	}
	console.info(message, objet);
	return message;
}

export function traitementErreurDB() {
	console.error(new Date().toISOString() + " - " + messages.get("ERREUR_DB").key);
	return { msg: messages.get("ERREUR_DB").key };
}

export function traitementErreur(message) {
	debug(message)
	message = messages.get(message).key;
	console.error(new Date().toISOString() + " - " + message);
	return { msg: message };
}

export function traitementMiseAJourReplace(result) {
	if (result.modifiedCount == 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

export function traitementMiseAJourConfig(result) {
	if (result.result.nModified >= 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

export function traitementMiseAJourUpdate(result) {
	if (result.result.nModified == 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

// Pour les mises à jour quand rien est fait, mais il n'y a pas d'erreur
export function traitementMiseAJourUpdateOK(result) {
	if (result.result.ok == 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

export function traitementInsertion(result) {
	if (result.insertedCount == 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

export function traitementSuppression(result) {
	if (result.deletedCount == 1) {
		return { msg: messages.get("SUCCES").key };
	} else {
		return { msg: messages.get("ECHEC").key };
	}
}

export function sendError(url, result) {
	console.error(new Date().toISOString() + " - " + url + " - " + config.httpstatus.SERVERERROR);
	res.status(config.httpstatus.SERVERERROR);
	res.send();
}

export function sendUnprocessable(url, res, result) {
	console.error(new Date().toISOString() + " - " + url + " - " + result.msg);
	res.status(config.httpstatus.UNPROCESSABLEENTITY);
	res.send(result);
}

export function sendNotFound(url, res) {
	console.error(new Date().toISOString() + " - " + url + " - " + messages.get("OBJET_EXISTE_PAS").key);
	res.status(config.httpstatus.NOTFOUND);
	res.send({ msg: messages.get("OBJET_EXISTE_PAS").key });
}

export function sendNotAuthorized(usager, res) {
	console.error(new Date().toISOString() + " - " + messages.get("USAGER_NON_AUTHORISE").key)
	console.error(new Date().toISOString() + " - " + usager)
	res.status(config.httpstatus.NOTAUTHORIZED);
	res.send();
}

export function sendResults(url, res, result) {
	if (result == null || (_.has(result, "msg") && result.msg == messages.get("OBJET_EXISTE_PAS").key)) {
		return sendNotFound(url, res);
	}
	if (_.has(result, "msg") && result.msg != messages.get("SUCCES").key) {
		return sendUnprocessable(url, res, result);
	}
	return res.send(result);
}

export function sendXMLResults(url, res, title, result) {
	if (result == null || (_.has(result, "msg") && result.msg == messages.get("OBJET_EXISTE_PAS").key)) {
		return sendNotFound(url, res);
	}
	if (_.has(result, "msg") && result.msg != messages.get("SUCCES").key) {
		return sendUnprocessable(url, res, result);
	}
	let XML = getRSS(title, result);
	return res.send(XML);
}

export function getRSS(title, nacqs, res) {

	/* lets create an rss feed */
	var feed = new RSS({
		title: title,
		feed_url: config.rss.feed_url,
		site_url: config.rss.site_url,
		image_url: config.rss.image_url,
		copyright: config.rss.copyright,
		language: config.rss.language,
		pubDate: new Date().toISOString(),
		ttl: config.rss.ttl
	})

	for (let i = 0; i < nacqs.length; i++) {
		let nacq = nacqs[i]
		let html = `<div style="display: flex"><div style="align-self: center"><img src='${nacq.image}' /></div><div><p>${nacq.auteurs}</p><p>${nacq.editeur}</p><p>${nacq.date}</p></div></div>`

		feed.item({
			title: nacq.titre,
			url: nacq.url,
			date: nacq.datenouveaute,
			image: nacq.image,
			description: html
		})
	}
	return feed.xml()
}

// Convertit une date dans le format ISO en moment
// Les dates dans le format iso doivent avoir toujours l'heure, les minutes, les seconds et les milliseconds égaux à 0
export function dateISOStringToMoment(date) {
	return date.indexOf("T") ? moment(date.split("T")[0]).utcOffset(0).set({
		hour: 0,
		minute: 0,
		second: 0,
		milliseconds: 0
	}) :
		moment(date).utcOffset(0).set({
			hour: 0,
			minute: 0,
			second: 0,
			milliseconds: 0
		})

}

export function getToday() {
	let today = moment().utcOffset(0).set({
		hour: 0,
		minute: 0,
		second: 0,
		milliseconds: 0
	})
	return today;
}

/* Fonctions pour le formattage */
export function getLangueNames(codes) {
	let names = []
	for (let i = 0; i < codes.length; i++) {
		let found = false
		if (PRIMO_LANGUAGES_CODE[codes[i]]) {
			names.push(PRIMO_LANGUAGES_CODE[codes[i]].fre)
		} else {
			names.push(codes[i])
		}
	}
	return names;
}

export function getBibNames(codes) {
	let names = []
	for (let i = 0; i < codes.length; i++) {
		if (BIBS[codes[i]]) {
			names.push(BIBS[codes[i]].long)
		} else {
			names.push(codes[i])
		}
	}
	return names;
}

export function getBibName(code) {

	debug("code", code)
	debug(BIBS[code])
	return BIBS[code] ? BIBS[code].long : ""
}

export function getDisciplineName(discipline) {
	let disciplines = DISCIPLINES.keys
	for (let i = 0; i < disciplines.length; i++) {
		if (discipline == disciplines[i].key) {
			return disciplines[i].label
		}
	}
	return undefined;
}

export function format(notice) {
	let formatednotice = JSON.parse(JSON.stringify(notice))
	if (formatednotice.langues) {
		formatednotice.langues = getLangueNames(formatednotice.langues)
	}
	if (formatednotice.bibs) {
		formatednotice.bibs = getBibNames(formatednotice.bibs)
	}
	if (formatednotice.disciplines) {
		formatednotice.disciplines = formatednotice.disciplines.map(function (discipline) { return getDisciplineName(discipline) })
	}
	delete formatednotice.bibs;
	delete formatednotice.cotes;
	return formatednotice;
}

export function formatUrlCampagneGAPage(notice, value) {
	let ajout = config.google_analytics.campagne;
	ajout += config.google_analytics.mediumpage;
	notice.url = notice.url + ajout + config.google_analytics.source + value;
	return notice;
}

export function formatUrlCampagneGARSS(notice, value) {
	let ajout = config.google_analytics.campagne;
	ajout += config.google_analytics.mediumrss;
	notice.url = notice.url + ajout + config.google_analytics.source + value;
	return notice;
}

