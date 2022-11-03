import mongodbPkg from 'mongodb'
import nodeGlobalProxy from 'node-global-proxy'
import config from 'config'

import { getOclcNumbersFromFile, getBatchNacqsFromWMS, insert, updateDisciplines, deleteOldNacqs } from '../app/models/nacq.js'
import { isSuccess } from '../app/lib/commons.js'
import console from '../app/lib/console.js'

const { MongoClient } = mongodbPkg

const proxy = nodeGlobalProxy.default

// Setting up proxy if needed

if (config.get('httpClient.proxy')) {

  console.debug('Using proxy settings')

  proxy.setConfig(config.get('httpClient.proxy'))
  proxy.start()

}

async function run() {
  const oclcNumbersFilePath = config.get('oclcNumbersFilePath');
  const db = await MongoClient.connect(config.get('mongoDBUrl'), config.get('mongoDBOptions'));
  const oclcNumbers = await getOclcNumbersFromFile(oclcNumbersFilePath);
  const { finalResults: result, rejected } = await getBatchNacqsFromWMS(oclcNumbers);
  let totalInsertedNacqs = 0;
  let totalUpdatedNacqs = 0;
  let totalNacqs = 0;

  if ((result.length > 0) && db) {
    for (const notice of result) {
      // console.log(notice)
      let result = await insert(notice, db)
      if (isSuccess(result)) {
        totalInsertedNacqs++
      } else {
        let result = await updateDisciplines(notice, db)
        totalUpdatedNacqs++
      }
      totalNacqs++
    }
  }

  const deleteResult = await deleteOldNacqs(db);


  console.log(`${totalInsertedNacqs} records inserted into db.`)
  console.log(`${totalUpdatedNacqs} records updated into db.`)
  console.log(`${result.length} total records imported.`)
  console.log(`${deleteResult.deletedCount} old records deleted.`)

  console.log('Terminé')

  process.exit();
}

run();