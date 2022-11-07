import { MongoClient } from 'mongodb'
import config from 'config'

export const client = new MongoClient(config.get('mongodb.url'))

try {
  await client.connect()
} catch (error) {
  console.error(`Could not connect to mongodb server: ${error}`)
  process.exit()
}

export const db = client.db(config.get('mongodb.dbName'))
