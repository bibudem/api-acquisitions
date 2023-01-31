import { readFile } from 'node:fs/promises'
import nodeGlobalProxyModule from 'node-global-proxy'
import config from 'config'

import { client } from '../app/db/index.js'
import { Nacq } from '../app/models/nacq.js'
import { getBatchNacqsFromWMS } from '../app/lib/nacq-importer.js'
import console from '../app/lib/console.js'

const proxy = nodeGlobalProxyModule.default

// Setting up proxy if needed

if (config.get('httpClient.proxy')) {

  console.debug('Using proxy settings')

  proxy.setConfig(config.get('httpClient.proxy'))
  proxy.start()

}

async function getOclcNumbersFromFile(filepath) {
  const oclcNumbersRegExp = /\d+/g;
  const result = new Set();
  let number;

  const data = await readFile(filepath)

  while ((number = oclcNumbersRegExp.exec(data)) !== null) {
    result.add(number[0]);
  }

  console.debug(`${result.size} OCLC numbers found in file.`)

  return [...result.values()] // Creates an array of distinct values
}


const oclcNumbersFilePath = config.get('oclcNumbersFilePath')
const oclcNumbers = await getOclcNumbersFromFile(oclcNumbersFilePath);
let result
let inserted = 0
let updated = 0
let failed = 0

try {
  result = await getBatchNacqsFromWMS(oclcNumbers);
} catch (error) {
  console.error('Could not get batch nacqs from WMS. Error: ', error)
  process.exit(1)
}

if (result.length > 0) {
  for (const notice of result) {
    // console.log(notice)
    const result = await Nacq.upsert(notice)

    if (result.acknowledged) {
      if (result.upsertedCount) {
        inserted++
      } else {
        updated++
      }
      continue
    }

    failed++
    console.error(`Could not upsert notice id ${notice.id} in database.`)
  }
}

const deleteResult = await Nacq.deleteExpired();

await client.close()

console.log(`${inserted} records inserted into db.`)
console.log(`${updated} records updated into db.`)
console.log(`${failed} failed insertions.`)
console.log(`${result.length} total records imported.`)
console.log(`${deleteResult.deletedCount} old records deleted.`)

console.log('Finished.')