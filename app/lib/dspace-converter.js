import { assignIn } from 'lodash-es'
import config from 'config'
import console from './console.js'

/*
 * getNewRecordDate
 */
// function getNewRecordDate(marc008) {
//   let year = marc008.substring(0, 2)
//   let month = marc008.substring(2, 4)
//   let day = marc008.substring(4, 6)
//   // console.log("year", year)
//   // console.log("month", month)
//   // console.log("day", day)
//   let date = new Date(parseInt(year) + 2000, parseInt(month) - 1, parseInt(day), 0, 0, 0)
//   let limitenacq = new Date();
//   // Pour être considérer une nouvelle acquisition, il faut avoir la date plus récente que 120 jours en arrière
//   limitenacq.setDate(limitenacq.getDate() - 120);
//   if (date >= limitenacq) {
//     return date
//   }
//   return false;
// }

export class DSpaceConverter {
  static getDisciplineByCreator(lsr08) {
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

  // static getNotice(doc) {
  //   const notice = {}
  //   try {
  //     const type = doc.PrimoNMBib.record.display.type
  //     const marc490 = doc.PrimoNMBib.record.search.lsr08
  //     // si c'est une thèse de doctorat ou de maîtrise, on peut déduire la discipline
  //     if ((type == 'book') && (marc490 && marc490.indexOf("Thèse") != -1)) {
  //       const marc008 = doc.PrimoNMBib.record.search.lsr29
  //       notice.datenouveaute = getNewRecordDate(marc008)
  //       if (notice.datenouveaute) {
  //         const disciplines = getDiscipline(marc490)
  //         if (disciplines.length > 0) {
  //           notice.titre = doc.PrimoNMBib.record.display.title
  //           notice.auteur = getDspaceAuthor(doc.PrimoNMBib.record.display.creator)
  //           notice.descriptions = doc.PrimoNMBib.record.display.description

  //           assignIn(notice, {
  //             disciplines: disciplines
  //           })

  //           return notice;
  //         } else {
  //           console.log("Pas de discipline papyrus ", "http://hdl.handle.net/" + doc.PrimoNMBib.record.control.sourcerecordid)
  //         }
  //       }
  //       console.log("Ce n'est pas une nouveauté papyrus", "http://hdl.handle.net/" + doc.PrimoNMBib.record.control.sourcerecordid)
  //       return undefined;
  //     }
  //     return undefined;
  //   } catch (e) {
  //     console.error('Could not convert notice from DSpace: ', doc, error)
  //     return undefined;
  //   }
  // }
}