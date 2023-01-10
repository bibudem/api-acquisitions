import fs from 'fs'
import axios from 'axios'
import _ from 'lodash'
import { getProperty, hasProperty } from 'dot-prop'
import ProgressBar from 'progress'
import debugFactory from 'debug'
import config from 'config'

import { db } from '../db/index.js'
import { OclcSearchService } from '../lib/oclc-search-service.js'
import console from '../lib/console.js'

import messages from '../../config/messages.js'
import { traitementInsertion, traitementErreur, traitementMiseAJourUpdateOK } from '../lib/commons.js'

const debug = debugFactory('nacq:model:nacq')

const COLLECTION = 'nacqs',
    critereSort = {
        datenouveaute: -1
    },
    projection = {
        _id: false
    };

const wskey = config.get('oclcSearchAPIKey');

export async function getOclcNumbersFromFile(filepath) {
    return new Promise((resolve, reject) => {
        const oclcNumbersRegExp = /\d+/g;
        const result = new Set();
        let number;

        fs.readFile(filepath, (err, data) => {
            if (err) {
                return reject(err);
            }

            try {
                while ((number = oclcNumbersRegExp.exec(data)) !== null) {
                    result.add(number[0]);
                }

                console.debug(`${result.size} OCLC numbers found in file.`)

                return resolve([...result.values()]); // Creates an array of distinct values

            } catch (e) {
                reject(e)
            }

        })
    })
}

export async function getBatchNacqsFromWMS(oclcNumbers) {
    return new Promise(async (resolve, reject) => {
        try {
            const searchService = new OclcSearchService(wskey);
            let results = [];
            let bibRecords;
            let finalResults = [];
            let countBibRecords = 0;
            let countHoldings = 0;
            const rejected = [];
            const bar = new ProgressBar('  downloading [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: oclcNumbers.length
            })

            console.log(`Sending request to WMD for ${oclcNumbers.length} oclc numbers.`)

            try {
                bibRecords = await searchService.getBibRecordsByOclcNumber(oclcNumbers);

                countBibRecords = bibRecords.length;

                console.info(`Found ${countBibRecords} bib records.`)

            } catch (e) {
                console.warn(e);
            }

            console.info('Importing holdings...')

            for (const bibRecord of bibRecords) {
                try {

                    const holding = await searchService.getHoldingByOclcNumber(bibRecord.identifier.oclcNumber);
                    countHoldings++;
                    bar.tick(1)

                    // console.info(`${countHoldings} of ${bibRecords.length}`)

                    results.push({
                        bibRecord,
                        holding
                    });
                } catch (e) {
                    console.warn(`Could not import holding for oclc number ${oclcNumber}`)
                }
            }

            console.log(`- ${countBibRecords} records found from WMS service.`)
            console.log(`- ${countHoldings} holdings found from WMS service.`)

            const resultsBar = new ProgressBar('  Creating records [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: results.length
            })

            for (const result of results) {
                try {
                    const res = await getBibRecord(result);
                    resultsBar.tick(1)
                    finalResults.push(res);
                } catch (e) {
                    rejected.push(result)
                    if (e) {
                        console.warn(e)
                    }
                }
            }
            console.log(`- ${finalResults.length} records converted.`)
            console.info('End of batch acquisition.')
            return resolve({ finalResults, rejected });
        } catch (e) {
            reject(e)
        }
    })
}

export async function getBibRecord({ bibRecord, holding }) {
    return new Promise(async (resolve, reject) => {
        const record = {}

        try {
            record.id = bibRecord.identifier.oclcNumber;
            record.titre = bibRecord.title.mainTitles[0].text;

            if (bibRecord.contributor?.creators) {
                record.auteurs = getCreators(bibRecord.contributor.creators);
            }

            record.url = config.get('urlPermalienCatalogue') + bibRecord.identifier.oclcNumber;
            record.categorielivraison = getDeliveryCategory(bibRecord.format);
            record.type = getType(bibRecord.format.generalFormat);

            const date = getRecordDate(getProperty(bibRecord, 'bibRecord.date.createDate'));
            if (date) {
                record.date = date;
            }

            /*
            if (doc.PrimoNMBib.record.facets.topic) {
                notice.subjets = doc.PrimoNMBib.record.facets.topic
            }
            */

            if (typeof bibRecord.publishers !== 'undefined') {
                const publisher = getPublisher(bibRecord.publishers);
                if (publisher) {
                    record.editeur = publisher;
                }
            }
            // if ((notice.type == "article") && (doc.PrimoNMBib.record.display.ispartof)) {
            //     notice.revue = doc.PrimoNMBib.record.display.ispartof.split("$$")[0]
            // }
            // if ((notice.type == "ArtChap") && (doc.PrimoNMBib.record.display.ispartof)) {
            //     notice.livre = doc.PrimoNMBib.record.display.ispartof.split("$$")[0]
            // }
            record.cotes = getCotes(bibRecord, holding);

            let disciplines = getDisciplines(record.cotes, holding, bibRecord)
            if (disciplines.length == 0) {
                console.warn(`No discipline found for record ${record.url}`)
                return reject();
            }

            record.disciplines = disciplines;

            if (typeof bibRecord.description.physicalDescription !== 'undefined') {
                record.format = bibRecord.description.physicalDescription;
            }
            if (typeof bibRecord.summaries !== 'undefined') {
                record.descriptions = bibRecord.summaries.map(summary => summary.text)
            }

            const isbns = getIsbns(bibRecord.identifier);
            if (isbns) {
                record.isbns = isbns;
            }

            record.image = await getLienImage(isbns, record.type);

            /*
            let bibs = getBibs(doc.PrimoNMBib.record.display.availlibrary)
            if (bibs) {
                _.extend(notice, bibs)
            }
            */

            record.datenouveaute = getDateNewRecord();

            resolve(record);
        } catch (e) {
            console.error(e)
            console.error(bibRecord)
            reject();

        }
    })
}

/*
 * getRecordDate
 */
function getRecordDate(date) {
    if (date) {
        return date.createDate.length === 8 ? `${date.createDate.substr(0, 4)}-${date.createDate.substr(4, 2)}-${date.createDate.substr(6, 2)}` : date.createDate;
    }
    return null;
}

/*
 * getCreators
 */
function getCreators(creators) {
    return creators.map(creator => {
        if (typeof creator.nonPersonName !== 'undefined') {
            return creator.nonPersonName.text;
        }

        const name = [];

        if (typeof creator.firstName !== 'undefined') {
            name.push(creator.firstName.text)
        }

        if (typeof creator.secondName !== 'undefined') {
            name.push(creator.secondName.text)
        }

        return name.join(' ');
    })
}

/*
 * getPublisher
 */
function getPublisher(publishers) {
    if (typeof publishers === 'undefined') {
        return null;
    }

    const result = publishers.map(publisher => {
        let ret = [];
        if (typeof publisher.publicationPlace !== 'undefined') {
            ret.push(publisher.publicationPlace);
        }
        if (typeof publisher.publisherName !== 'undefined') {
            ret.push(publisher.publisherName.text);
        }
        return ret.length > 0 ? ret.join(' ') : null;
    })

    return result[0];
}

export async function getNotice(doc) {
    try {
        let notice = {}
        notice = getNoticeCommonFields(doc)
        //console.log("source = " + notice.sourceid)
        switch (notice.sourceid) {
            case 'UM-ALEPH':
                let alephNotice = await getAlephNotice(doc, notice)
                //console.log("alephnotice")
                //console.log(JSON.stringify(alephNotice))
                if (alephNotice) {
                    notice = _.merge(notice, alephNotice)
                } else {
                    notice = undefined
                }
                break;
            case 'dspace_marcxml':
                let dspaceNotice = getDspaceNotice(doc, notice)
                if (dspaceNotice) {
                    notice = _.merge(notice, dspaceNotice)
                } else {
                    notice = undefined
                }
                break;
            default:
                //console.log("undefined Dspace, SFX ou calipso");
                notice = undefined;
        }
        return notice
    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Fonction getNotice")
        console.error(new Date().toISOString() + " - ", doc)
        console.error(new Date().toISOString() + " - ", e)
        return undefined;
    }
}

export async function getAlephNotice(doc) {
    let notice = {}
    try {
        // Si c'est une notice d'Aleph, mais ce n'est pas indiqué "acquisitions recentes udem",
        // on ne tient pas compte de cette nouveauté. Probablement en commande.
        //console.log("lsr14 = " + doc.PrimoNMBib.record.search.lsr14)
        if (!doc.PrimoNMBib.record.search.lsr14) {
            //console.log("pas de champ lsr14")
            return undefined
        }
        if (doc.PrimoNMBib.record.search.lsr14 && doc.PrimoNMBib.record.search.lsr14 != "acquisitions recentes udem") {
            //console.log("pas de champ lsr14 avec la valeur 'acquisitions recentes...'")
            return undefined
        }
        let cotes = getCotes(doc.PrimoNMBib.record.search)
        _.extend(notice, cotes)
        if (cotes && cotes.cotes) {
            cotes = cotes.cotes
        } else {
            cotes = []
        }
        let disciplines = getDisciplines(cotes, doc.PrimoNMBib.record.display.availlibrary)
        if (disciplines.length == 0) {
            console.log(config.urlPermalienCatalogue + doc.PrimoNMBib.record.control["recordid"])
            return undefined;
        }
        // console.log("disciplines", disciplines)
        _.extend(notice, {
            "disciplines": disciplines
        })
        notice.titre = doc.PrimoNMBib.record.display.title
        if (doc.PrimoNMBib.record.facets.creatorcontrib) {
            if (typeof doc.PrimoNMBib.record.facets.creatorcontrib == "string") {
                notice.auteurs = [doc.PrimoNMBib.record.facets.creatorcontrib]
            } else {
                notice.auteurs = doc.PrimoNMBib.record.facets.creatorcontrib
            }
        }
        if (doc.PrimoNMBib.record.display.format) {
            notice.format = doc.PrimoNMBib.record.display.format
        }
        if (doc.PrimoNMBib.record.display.description) {
            notice.descriptions = [doc.PrimoNMBib.record.display.description]
        }
        let isbns = getIsbns(doc.PrimoNMBib.record.search);
        let bibs = getBibs(doc.PrimoNMBib.record.display.availlibrary)
        if (isbns) {
            _.extend(notice, isbns)
        }
        let isbnids = isbns ? isbns.isbns : null
        let lienimage = await getLienImage(isbnids, doc.PrimoNMBib.record.display.type)
        _.extend(notice, {
            image: lienimage
        })
        if (bibs) {
            _.extend(notice, bibs)
        }
        //Courriel de Carole du 03 avril 2018
        // console.log("datenouveaute", doc.PrimoNMBib.record.facets.newrecords)
        // On ne peut pas se fier à ce champ. On met donc la date d'aujourd'hui.
        notice.datenouveaute = getDateNewRecord()

        return notice;
    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Fonction getAlephNotice")
        console.error(new Date().toISOString() + " - ", doc)
        console.error(new Date().toISOString() + " - ", e)
        return undefined;
    }
}

export function getDspaceNotice(doc) {
    let notice = {}
    try {
        let type = doc.PrimoNMBib.record.display.type
        let marc490 = doc.PrimoNMBib.record.search.lsr08
        // si c'est une thèse de doctorat ou de maîtrise, on peut déduire la discipline
        if (((type == 'book')) && (marc490 && marc490.indexOf("Thèse") != -1)) {
            let marc008 = doc.PrimoNMBib.record.search.lsr29
            notice.datenouveaute = getDspaceNewRecordDate(marc008)
            if (notice.datenouveaute) {
                let disciplines = getDspaceDiscipline(marc490)
                if (disciplines.length > 0) {
                    notice.titre = doc.PrimoNMBib.record.display.title
                    notice.auteur = getDspaceAuthor(doc.PrimoNMBib.record.display.creator)
                    notice.descriptions = doc.PrimoNMBib.record.display.description
                    _.extend(notice, {
                        disciplines: disciplines
                    })
                    return notice;
                } else {
                    console.log("pas de discipline papyrus ", "http://hdl.handle.net/" + doc.PrimoNMBib.record.control.sourcerecordid)
                }
            }
            console.log("ce n'est pas une nouveauté papyrus", "http://hdl.handle.net/" + doc.PrimoNMBib.record.control.sourcerecordid)
            return undefined;
        }
        return undefined;
    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Fonction getDspaceNotice")
        console.error(new Date().toISOString() + " - ", doc)
        console.error(new Date().toISOString() + " - ", e)
        return undefined;

    }
}

/*
 * getDspaceDiscipline
 */
function getDspaceDiscipline(lsr08) {
    lsr08 = '' + lsr08;
    lsr08 = lsr08.normalize('NFD');

    const disciplinesByCreator = config.get('disciplinesByCreator');

    for (let i = 0; i < disciplinesByCreator.length; i++) {
        const disciplineByCreator = disciplinesByCreator[i];
        const creatorList = disciplineByCreator.c.map(c => c.normalize('NFD'));
        if (creatorList.some(creator => {
            return lsr08.indexOf(creator) !== -1;
        })) {
            return disciplineByCreator.d;
        }
    }
}

export function getDspaceAuthor(creator) {
    let authors = creator.split("$$Q")
    if (authors.length = 2) {
        return authors[1]
    }
    return creator;
}

export function getDspaceNewRecordDate(marc008) {
    let year = marc008.substring(0, 2)
    let month = marc008.substring(2, 4)
    let day = marc008.substring(4, 6)
    // console.log("year", year)
    // console.log("month", month)
    // console.log("day", day)
    let date = new Date(parseInt(year) + 2000, parseInt(month) - 1, parseInt(day), 0, 0, 0)
    let limitenacq = new Date();
    // Pour être considérer une nouvelle acquisition, il faut avoir la date plus récente que 120 jours en arrière
    limitenacq.setDate(limitenacq.getDate() - 120);
    if (date >= limitenacq) {
        return date
    }
    return false;
}

export function getBibCode(alephcode) {
    let code = ""
    switch (alephcode) {
        case 'bame':
            code = "am";
            break;
        case 'b7077':
            code = "antenne-paramedicale";
            break;
        case 'bchimie':
            code = "ch";
            break;
        case 'blcs':
            code = "cs";
            break;
        case 'bdroit':
            code = "dr";
            break;
        case 'bepcb':
            code = "ed";
            break;
        case 'bgeo':
            code = "gp";
            break;
        case 'bki':
            code = "ki";
            break;
        case 'blav':
            code = "laval";
            break;
        case 'bmai':
            code = "mi";
            break;
        case 'bmus':
            code = "mu";
            break;
        case 'bmv':
            code = "mv";
            break;
        case 'bpar':
            code = "pa";
            break;
        case 'bphy':
            code = "py";
            break;
        case 'bsante':
            code = "sa";
            break;
        case 'blsh':
            code = "ss";
            break;
    }
    return code;

}

export function getBibs(availlibrary) {
    try {
        if (availlibrary == undefined) {
            return undefined
        }
        // des fois, c'est un objet  et cela produit une erreur
        availlibrary += ""
        let values = availlibrary.split("$$")
        let bibs = []
        for (let i = 0; i < values.length; i++) {
            let type = values[i].substr(0, 1)
            let value = values[i].substr(1)
            if (type == "L") {
                bibs.push(getBibCode(value.toLowerCase()));
            }
        }
        return {
            bibs: bibs
        };
    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Fonction getBibs " + availlibrary)
        console.error(new Date().toISOString() + " - ", e)

    }
}

/*
 * getIsbns
 */
function getIsbns(identifier) {
    if (typeof identifier.isbns === 'undefined') {
        return undefined
    }
    return identifier.isbns;
}

/*
 * getCotes
 */
const getCotes = function (bibRecord, holdings) {
    try {
        const cotes = new Set();
        if (holdings.numberOfHoldings > 0) {
            holdings.detailedHoldings.forEach(holding => {
                const cote = getProperty(holding, 'callNumber.displayCallNumber');
                if (cote) {
                    cotes.add(cote)
                }
            })
        }

        if (cotes.size > 0) {
            return [...cotes.values()]
        }

        if (hasProperty(bibRecord, 'classification.lc')) {
            return [bibRecord.classification.lc];
        }

        return [];
    } catch (e) {
        console.error(e)
        return [];
    }
}

/*
 * getType
 */
function getType(type) {
    let ret;
    switch (type) {
        case 'Book':
            ret = "livre";
            break;
        case 'Jrnl':
            ret = "périodique"
            break;
        case 'ArtChap':
            ret = "chapitre de livre"
            break;
        case 'Music':
            ret = "enregistrement sonore"
            break;
        case 'Video':
            ret = "vidéo"
            break;
        case 'MsScr':
            ret = "partition"
            break;
        case 'Vis':
            ret = "image"
            break;
        case 'other':
        default:
            ret = "autre";
            break;
    }
    return ret;
}

/*
 * getDefaultImage
 */
function getDefaultImage(type) {

    switch (type) {
        case 'vidéo':
            type = 'video';
            break;

        case 'partition':
            type = 'score';
            break;

        case 'périodique':
            type = 'journal';
            break;

        case 'enregistrement sonore':
            type = 'audio';
            break;

        case 'livre':
        case 'image':
            break;

        default:
            type = "other";
    }

    return `${config.get('apiBaseUrl')}types/icon_${type.toLowerCase()}.png`;
}

/*
 * getDeliveryCategory
 */
function getDeliveryCategory(format) {
    if (typeof format.specificFormat !== 'undefined' && format.specificFormat === 'Digital') {
        return 'en_ligne';
    }
    return 'physique';
}

/*
 * getDateNewRecord
 */
function getDateNewRecord() {
    let today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return today;
}

/*
 * getNormalizedCote
 */
function getNormalizedCote(cote) {
    // On supprime les espaces et les points de la cote.
    cote = cote.replace(/ /g, '');
    cote = cote.replace(/\./g, '');
    // Tous les caractères en majuscules.
    return cote.toUpperCase()
}

/* 
 * getDisciplineByCoteLC
 */
function getDisciplineByCoteLC(c) {

    function hasMore3AlphaBeginingCharacters(cote) {
        let regex = /^[A-Z]{4}/g;
        let match = cote.match(regex)
        return (match != null) && match.length > 0;
    }

    function getOnlyOneLetter(cote) {
        let myRegexp = /^([A-Z])$/g;
        let match = myRegexp.exec(cote);
        return match ? match[1] : null
    }

    function getFirstLetterBeforeNumber(cote) {
        let myRegexp = /^([A-Z])[0-9.]/g;
        let match = myRegexp.exec(cote);
        return match ? match[1] : null
    }

    let discipline = undefined;
    let cote = getNormalizedCote(c)

    // Cote maison
    if (hasMore3AlphaBeginingCharacters(cote)) {
        return discipline
    }

    let firstLetterBeforeNumber = getFirstLetterBeforeNumber(cote)
    let firstChar = cote.substring(0, 1)
    let first2Chars = cote.substring(0, 2)
    let onlyOneLetter = getOnlyOneLetter(cote)

    // amenagement 
    if (
        first2Chars == "NA" ||
        first2Chars == "NK" ||
        first2Chars == "SB" ||
        first2Chars == "TH"
    ) {
        return "amenagement"
    }

    // anthropologie-demographie-sociologie et sousdisciplines
    if (
        firstLetterBeforeNumber == "H" ||
        onlyOneLetter == "H" ||
        (first2Chars >= "GF" && first2Chars <= "GT") ||
        first2Chars == "HA" ||
        (first2Chars >= "HM" && first2Chars <= "HT") ||
        first2Chars == "HX"
    ) {
        return "anthropologie-demographie-sociologie"
    }

    // art-cinema-musique 
    if (
        firstChar == "M" ||
        onlyOneLetter == "N" ||
        firstLetterBeforeNumber == "N" ||
        first2Chars == "AM" ||
        first2Chars == "PN" ||
        first2Chars == "TR" ||
        first2Chars == "TT" ||
        (first2Chars >= "NB" && first2Chars <= "NE") ||
        first2Chars == "NX"
    ) {
        return "art-cinema-musique"
    }

    // communication-sciences-information 
    if (
        firstChar == "Z" ||
        first2Chars == "ZA" ||
        first2Chars == "AS" ||
        first2Chars == "AZ" ||
        first2Chars == "P9"
    ) {
        return "communication-sciences-information"
    }

    // criminologie-psychologie-travail-social 
    if (
        first2Chars == "BF" ||
        first2Chars == "HV"
    ) {
        return "criminologie-psychologie-travail-social"
    }

    // droit
    if (
        firstChar == "K"
    ) {
        return "droit"
    }

    // economie-politique-relations-industrielles
    if (
        (first2Chars >= "HB" && first2Chars <= "HC") ||
        (first2Chars >= "HE" && first2Chars <= "HJ") ||
        first2Chars == "HD" ||
        firstLetterBeforeNumber == "J" ||
        (first2Chars >= "JA" && first2Chars <= "JC") ||
        (first2Chars >= "JF" && first2Chars <= "JZ") ||
        firstChar == "V" ||
        firstChar == "U"
    ) {
        return "economie-politique-relations-industrielles"
    }

    // etudes-religieuses-histoire-philosophie
    if (
        firstChar == "C" ||
        firstChar == "F" ||
        firstLetterBeforeNumber == "E" ||
        (first2Chars >= "DA" && first2Chars <= "DH") ||
        (first2Chars >= "DJ" && first2Chars <= "DU") ||
        firstLetterBeforeNumber == "D" ||
        first2Chars == "DX" ||
        (first2Chars >= "BC" && first2Chars <= "BD") ||
        (first2Chars >= "BH" && first2Chars <= "BJ") ||
        (first2Chars >= "BL" && first2Chars <= "BX") ||
        firstLetterBeforeNumber == "B" ||
        onlyOneLetter == "B" ||
        onlyOneLetter == "D" ||
        onlyOneLetter == "E"
    ) {
        return "etudes-religieuses-histoire-philosophie"
    }

    // informatique-mathematique-sciences-nature
    if (
        firstLetterBeforeNumber == "Q" ||
        onlyOneLetter == "Q" ||
        firstLetterBeforeNumber == "G" ||
        onlyOneLetter == "G" ||
        (first2Chars >= "GA" && first2Chars <= "GE") ||
        (first2Chars >= "QA" && first2Chars <= "QR") ||
        firstLetterBeforeNumber == "S" ||
        (first2Chars >= "SD" && first2Chars <= "SK") ||
        (first2Chars >= "TA" && first2Chars <= "TG") ||
        (first2Chars >= "TJ" && first2Chars <= "TP") ||
        first2Chars == "TS" ||
        firstLetterBeforeNumber == "T"
    ) {
        return "informatique-mathematique-sciences-nature"
    }

    // langues-litteratures
    if (
        onlyOneLetter == "P" ||
        (first2Chars >= "PA" && first2Chars <= "PM") ||
        (first2Chars >= "PQ" && first2Chars <= "PZ") ||
        (first2Chars >= "P1" && first2Chars <= "P8")
    ) {
        return "langues-litteratures"
    }

    // education-psychoeducation
    if (
        firstChar == "L"
    ) {
        return "education-psychoeducation"
    }

    // sciences-sante
    if (
        firstChar == "W" ||
        firstChar == "R" ||
        first2Chars == "TX" ||
        first2Chars == "GV" ||
        first2Chars == "SF" ||
        (first2Chars >= "QS" && first2Chars <= "QZ")
    ) {
        return "sciences-sante"
    }

    return discipline;
}

export function getDisciplineByCoteDewey() {
    return undefined;
}

/*
 * getDisciplineByHoldings
 */
const getDisciplineByHoldings = function (holdings) {
    const availability = [];
    function sublocationEquals(holding, value) {
        return typeof holding.location.sublocationCollection !== 'undefined' && holding.location.sublocationCollection === value;
    }
    if (holdings && holdings.numberOfHoldings > 0) {
        holdings.detailedHoldings.forEach(holding => {

            if (sublocationEquals(holding, 'JEU-R') || sublocationEquals(holding, 'DIC') ||
                sublocationEquals(holding, 'DIM') || sublocationEquals(holding, 'BMUS')) {
                availability.push('art-cinema-musique');
            }
            if (sublocationEquals(holding, 'BDRO')) {
                availability.push('droit');
            }
            if (sublocationEquals(holding, 'JEU-H')) {
                availability.push('etudes-religieuses-histoire-philosophie');
            }
            if (sublocationEquals(holding, 'JEU-M') || sublocationEquals(holding, 'BCHI') ||
                sublocationEquals(holding, 'BMAI') || sublocationEquals(holding, 'BGEO') ||
                sublocationEquals(holding, 'BPHY') || sublocationEquals(holding, 'JEU-S')
            ) {
                availability.push('informatique-mathematique-sciences-nature');
            }
            if (sublocationEquals(holding, 'JEU-F')) {
                availability.push('langues-litteratures');
            }
            if (sublocationEquals(holding, 'DID') || sublocationEquals(holding, 'DIDJE') ||
                sublocationEquals(holding, 'DIDJA') || sublocationEquals(holding, 'JEU')) {
                availability.push('education-psychoeducation');
            }
            if (sublocationEquals(holding, 'BMDV') || sublocationEquals(holding, 'BPAR') || sublocationEquals(holding, 'BSAN')) {
                availability.push('sciences-sante');
            }
            if (sublocationEquals(holding, 'BAME')) {
                availability.push('amenagement');
            }
        })
        return availability;
    }
    return undefined
}

/*
 * getDisciplines
 */
const getDisciplines = function (cotes, holding, bibRecord) {

    let disciplines = []
    let discipline = null;
    for (let i = 0; i < cotes.length; i++) {

        let cote = getNormalizedCote(cotes[i])
        // console.debug("getDisciplineByCoteLC avant ", cote)
        discipline = getDisciplineByCoteLC(cote)
        if (discipline) {
            // console.debug("discipline by cote", discipline)
            disciplines.push(discipline)
        }
    }
    const disciplinesByHolding = getDisciplineByHoldings(holding)
    // debug("discipline by holding", disciplinesByHolding)

    if (disciplinesByHolding) {
        disciplines.push(...disciplinesByHolding)
    }

    if (hasProperty(bibRecord, 'contributor.creators')) {
        // console.log('== has creators')
        const creatorNotes = bibRecord.contributor.creators
            .filter(creator => {
                return typeof creator.creatorNotes !== 'undefined';
            })
            .map(creator => creator.creatorNotes);

        if (creatorNotes.length > 0) {
            const disciplinesByCreatorNotes = creatorNotes.map(getDspaceDiscipline).filter(d => d !== undefined);
            // console.log(bibRecord.identifier.oclcNumber)
            // console.log(disciplinesByCreatorNotes)
            if (disciplinesByCreatorNotes.length > 0) {
                disciplines.push(...disciplinesByCreatorNotes)
            }
        }
    }

    return _.sortBy(_.uniq(disciplines))
}

// return urls de l'image de la couverture (3 formats?)
export async function getThumbnailLinkFromSyndetics(isbn) {
    let url = config.get('syndeticsApi.url') + isbn + config.get('syndeticsApi.params')
    try {
        const res = await axios.get(url);
        //console.log("response syndetics", res)
        // On vérifie que la taille de l'image est différente de la taille de l'image par défaut
        if ((res.status == 200) && res.headers['content-length'] != 86) {
            return url;
        }
        return undefined;

    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Erreur function getThumbnailLinkFromSyndetics - isbn = " + isbn)
        console.error(new Date().toISOString() + " - ", e)
        return undefined;
    }
}

// return urls de l'image de la couverture (3 formats?)
export async function getThumbnailLinkFromGoogleBooksApi(isbn) {
    let url = config.get('googleBooksApi.url') + isbn + config.get('googleBooksApi.params') + config.get('googleBooksApi.key')
    try {
        const res = await axios.get(url);
        if ((res.status == 200) && (res.data.totalItems == 1) && (res.data.items[0].volumeInfo) && (res.data.items[0].volumeInfo.imageLinks)) {
            let lien = res.data.items[0].volumeInfo.imageLinks.smallThumbnail;
            if (lien.indexOf("http://") != -1) {
                lien = lien.replace("http://", "https://")
            }
            return lien;
        }
        return undefined;

    } catch (e) {
        //console.error(new Date().toISOString() + " - " + "Erreur function getThumbnailLinkFromGoogleBooksApi - isbn = " + isbn)
        //console.error(new Date().toISOString() + " - " , e)
        return undefined;
    }
}

// return urls de l'image de la couverture (3 formats?)
export async function getThumbnailLinkFromAmazonBooksApi(isbn) {
    try {
        const instance = axios.create({
            timeout: 2000,
        });
        const res = await instance.get(config.get('amazonBooksApi.url') + isbn + "._" + config.get('amazonBooksApi.taille'));
        if ((res.status == 200) && (res.request.res)) {
            return res.request.res.responseUrl;
        }
        return undefined;

    } catch (e) {
        console.error(new Date().toISOString() + " - " + "Erreur function getThumbnailLinkFromAmazonBooksApi ")
        console.error(new Date().toISOString() + " - " + "isbn = " + isbn)
        console.error(new Date().toISOString() + " - ", e)
        return undefined;
    }
}

export async function getThumbnailLinkFromOpenLibraryCoversApi(isbn) {
    const instance = axios.create({
        timeout: 2000,
    });
    const res = await instance.get(config.get('openLibraryCoversApi.url') + isbn + config.get('openLibraryCoversApi.params'));
    if ((res.status == 200) && (res.config) && (res.config.url)) {
        return res.config.url;
    }
    return undefined
}

/*
 * getLienImage
 */
async function getLienImage(isbns, type) {
    let lien = null

    if (isbns) {
        // D'abord on récupère l'image de syndetics
        for (let i = 0; i < isbns.length; i++) {
            let isbn = isbns[i];
            console.debug(`Looking for images from Syndetics for isbn ${isbn}`)
            lien = await getThumbnailLinkFromSyndetics(isbn)
            if (lien) {
                console.debug(`Found one`)
                break;
            }
        }
        // s'il n'y a pas dans syndetics on la récupère de google
        if (lien == null) {
            //console.log("aucune image from syndetics")
            for (let i = 0; i < isbns.length; i++) {
                let isbn = isbns[i];
                console.debug(`Looking for images from Google for isbn ${isbn}`)
                lien = await getThumbnailLinkFromGoogleBooksApi(isbn)
                if (lien) {
                    console.debug(`Found one`)
                    break;
                }
            }

        }
    }

    // sinon on prend l'image par défaut
    if (!lien) {
        console.debug(`Did not find any thumbnail, resolving to default image`)
        lien = getDefaultImage(type)
    }
    return lien;
}

/*
 * all
 */
export async function all() {
    const notices = await db.collection(COLLECTION).find({}, projection).sort(critereSort).toArray()
    return notices
}

export async function allInDiscipline(discipline) {
    const notices = await db.collection(COLLECTION).find({
        disciplines: {
            $elemMatch: {
                $eq: discipline
            }
        }
    }, projection).sort(critereSort).toArray()
    return notices
}

export async function allInDisciplineFromDateNouveaute(discipline, date) {
    date = typeof date == "object" ? date : new Date(date)
    const notices = await db.collection(COLLECTION).find({
        disciplines: {
            $elemMatch: {
                $eq: discipline
            }
        },
        datenouveaute: {
            $gte: date
        }
    }, projection).sort(critereSort).toArray()
    return notices
}

export async function allInBib(bib) {
    const notices = await db.collection(COLLECTION).find({
        bibs: {
            $elemMatch: {
                $eq: bib
            }
        }
    }, projection).sort(critereSort).toArray()
    return notices
}

export async function allInBibFromDateNouveaute(bib, date) {
    date = typeof date == "object" ? date : new Date(date)
    const notices = await db.collection(COLLECTION).find({
        bibs: {
            $elemMatch: {
                $eq: bib
            }
        },
        datenouveaute: {
            $gte: date
        }
    }, projection).sort(critereSort).toArray()
    return notices
}

export async function allFromDateNouveaute(date) {
    date = typeof date == "object" ? date : new Date(date)
    debug("allFromDateNouveaute", date)
    const notices = await db.collection(COLLECTION).find({
        datenouveaute: {
            $gte: date
        }
    }, projection).sort(critereSort).toArray()
    return notices
}

export async function one(id) {
    const notice = await db.collection(COLLECTION).findOne({
        id: id
    }, projection);
    return notice
}

/*
 * insert
 * Insertion d'une nouvelle acquisition
 */
export async function insert(nacq) {

    try {
        const result = await db.collection(COLLECTION).findOne({
            id: nacq.id
        })
        if (result) {
            return {
                msg: messages.get("OBJET_EXISTE").key
            }
        } else {
            nacq.datenouveaute = new Date()
            nacq.datenouveaute.setUTCHours(0, 0, 0, 0)
            const result2 = await db.collection(COLLECTION).insertOne(nacq)
            //console.log("result2", result2.insertedId)
            //console.log("db", db)
            if (result2) {
                return traitementInsertion(result2);
            } else {
                console.log("result insertion problematique", nacq)
                return { msg: messages.get("ERREUR") }
            }
        }
    } catch (e) {
        console.error(e)
        console.error(nacq)
        return { msg: messages.get("ERREUR") }
    }
}


export async function del(id) {
    const result = await db.collection(COLLECTION).findOne({
        id: id
    }, projection);
    if (result) {
        const result1 = await db.collection(COLLECTION).deleteOne({
            id: id
        })
        if (result1) {
            if (result1.deletedCount == 1) {
                return {
                    msg: messages.get("SUCCES").key
                };
            }
        }
        return traitementErreur("ERREUR_SUPPRESSION");
    } else {
        return {
            msg: messages.get("OBJET_EXISTE_PAS").key
        };
    }
}

/*
 * deleteOldNacqs
 */
export async function deleteOldNacqs(ttl = config.get('nacqsTtl')) {
    const dateNouveaute = new Date();
    dateNouveaute.setDate(dateNouveaute.getDate() - ttl);
    debug("deleteBeforeDateNouveaut")
    debug(dateNouveaute)
    debug(dateNouveaute.toISOString())

    const result = await db.collection(COLLECTION).deleteMany({
        datenouveaute: {
            $lt: dateNouveaute
        }
    })
    return result;
}

/*
 * updateDisciplines
 */
export async function updateDisciplines(nacq) {
    debug("updatedisciplines", nacq)
    try {
        const existedeja = await db.collection(COLLECTION).findOne({
            id: nacq.id
        })
        if (existedeja) {
            const result = await db.collection(COLLECTION).updateOne({
                id: nacq.id
            }, { $set: { disciplines: nacq.disciplines }, $currentDate: { datederniermiseajour: true } })
            //debug("result mise à jour", result)
            if (result) {
                return traitementMiseAJourUpdateOK(result)
            }
        } else {
            return traitementErreur("NON_DISPONIBLE");
        }

        return { msg: messages.get("ERREUR") }
    } catch (e) {
        console.error(e)
        console.error(nacq)
        return { msg: messages.get("ERREUR") }
    }
}
