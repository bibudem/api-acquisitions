import { MongoClient } from 'mongodb'
import yargs from 'yargs'
import config from 'config'
import { deleteOldNacqs } from './app/models/nacq'
import console from './lib/console'

async function getDb() {
  return await MongoClient.connect(config.get('mongoDBUrl'), config.get('mongoDBOptions'));
}

yargs
  .usage('node $0 <cmd> [args] ')
  .command('delete [days]', 'Delete recods from db olders then [days]', (yargs) => {
    yargs.positional('days', {
      type: 'number',
      default: 0
    })
  }, async function (argv) {
    const db = await getDb();
    const records = await deleteOldNacqs(db, argv.days);
    console.log(`${records.deletedCount} records deleted`)
    process.exit();
  })
  .help()
  .argv
