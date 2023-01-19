import { getProperty, hasProperty } from 'dot-prop'
import config from 'config'
import { DSpaceConverter } from './dspace-converter.js'
import { getThumbnailLink } from './thumbnail.js'
import console from './console.js'

export async function convertOclcBibRecordToNacq({ bibRecord, holding }) {
  const record = {}

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

  if (typeof bibRecord.publishers !== 'undefined') {
    const publisher = getPublisher(bibRecord.publishers);
    if (publisher) {
      record.editeur = publisher;
    }
  }

  record.cotes = getCotes(bibRecord, holding);

  const disciplines = getDisciplines(record.cotes, holding, bibRecord)
  if (disciplines.length == 0) {
    console.warn(`No discipline found for record ${record.url}`)
    return null;
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

  record.image = await getThumbnailLink(isbns, record.type);

  record.datenouveaute = getDateNewRecord();

  return record;
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
 * getDeliveryCategory
 */
function getDeliveryCategory(format) {
  if (typeof format.specificFormat !== 'undefined' && format.specificFormat === 'Digital') {
    return 'en_ligne';
  }
  return 'physique';
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
 * getRecordDate
 */
function getRecordDate(date) {
  if (date) {
    return date.createDate.length === 8 ? `${date.createDate.substr(0, 4)}-${date.createDate.substr(4, 2)}-${date.createDate.substr(6, 2)}` : date.createDate;
  }
  return null;
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
 * getDisciplines
 */
const getDisciplines = function (cotes, holding, bibRecord) {

  const disciplines = new Set()
  let discipline = null;

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

  /*
   * getDisciplineByHoldings
   */
  function getDisciplineByHoldings(holdings) {
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

  for (let i = 0; i < cotes.length; i++) {

    let cote = getNormalizedCote(cotes[i])
    // console.debug("getDisciplineByCoteLC avant ", cote)
    discipline = getDisciplineByCoteLC(cote)
    if (discipline) {
      // console.debug("discipline by cote", discipline)
      disciplines.add(discipline)
    }
  }
  const disciplinesByHolding = getDisciplineByHoldings(holding)

  if (disciplinesByHolding) {
    disciplinesByHolding.forEach(disciplineByHolding => disciplines.add(disciplineByHolding))
  }

  if (hasProperty(bibRecord, 'contributor.creators')) {
    // console.log('== has creators')
    const creatorNotes = bibRecord.contributor.creators
      .filter(creator => {
        return typeof creator.creatorNotes !== 'undefined';
      })
      .map(creator => creator.creatorNotes);

    if (creatorNotes.length > 0) {
      const disciplinesByCreatorNotes = creatorNotes.map(DSpaceConverter.getDisciplineByCreator).filter(d => d !== undefined);
      // console.log(bibRecord.identifier.oclcNumber)
      // console.log(disciplinesByCreatorNotes)
      if (disciplinesByCreatorNotes.length > 0) {
        disciplinesByCreatorNotes.forEach(disciplineByCreatorNotes => disciplines.add(disciplineByCreatorNotes))
      }
    }
  }

  return [...disciplines.values()].sort()
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
 * getDateNewRecord
 */
function getDateNewRecord() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return today;
}