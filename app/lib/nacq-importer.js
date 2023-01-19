import ProgressBar from 'progress'
import config from 'config'
import { OclcSearchService } from './oclc-search-service.js'
import { convertOclcBibRecordToNacq } from './nacq-converter.js'
import console from './console.js'

const wskey = config.get('oclcApi.search.key')

export async function getBatchNacqsFromWMS(oclcNumbers) {
  return new Promise(async (resolve, reject) => {

    const searchService = new OclcSearchService(wskey);
    const results = [];
    let bibRecords;
    const nacqs = [];
    let countHoldings = 0;
    const rejected = [];
    const bar = new ProgressBar(' Downloading [:bar] :percent :etas', {
      complete: '█',
      incomplete: '▒',
      width: 50,
      total: oclcNumbers.length
    })

    console.log(`Sending request to WMD for ${oclcNumbers.length} oclc numbers.`)

    try {
      bibRecords = await searchService.getBibRecordsByOclcNumber(oclcNumbers);

      console.log(`- ${bibRecords.length} records found from WMS service.`)

    } catch (e) {
      console.warn(e);
    }

    console.info('Importing holdings...')

    for (const bibRecord of bibRecords) {
      try {

        const holding = await searchService.getHoldingByOclcNumber(bibRecord.identifier.oclcNumber);
        countHoldings++;
        bar.tick(1)

        results.push({
          bibRecord,
          holding
        });
      } catch (e) {
        console.warn(`Could not import holding for oclc number ${bibRecord.identifier.oclcNumber}`)
      }
    }

    console.log(`- ${countHoldings} holdings found from WMS service.`)

    const resultsBar = new ProgressBar(' Creating records [:bar] :percent :etas', {
      complete: '█',
      incomplete: '▒',
      width: 50,
      total: results.length
    })

    for (const result of results) {
      try {
        const nacq = await convertOclcBibRecordToNacq(result);
        resultsBar.tick(1)

        if (nacq) {
          nacqs.push(nacq);
        }
      } catch (error) {
        rejected.push(result)
        if (error) {
          console.error(error)
        }
      }
    }

    console.log(`- ${nacqs.length} records converted.`)
    console.log(`- ${rejected.length} records failed convertion.`)
    console.info('End of batch acquisition.')

    resolve(nacqs);
  })
}