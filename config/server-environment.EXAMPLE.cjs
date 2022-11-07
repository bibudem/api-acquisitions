const { join } = require('path')

const mongoDBPort = '123'
const mongoDBHostname = 'localhost'
const mongoDBUser = 'user'
const mongoDBPw = 'pwd'
const mongoDBDBName = 'nacq'

module.exports = {
  server: {
    port: 8000
  },
  httpClient: {
    proxy: 'http://proxy.my-business.com:80',
    timeout: 30000
  },
  oclcNumbersFilePath: join(__dirname, '..', 'data', 'some-file'),
  mongodb: {
    url: `mongodb://${mongoDBUser}:${mongoDBPw}@${mongoDBHostname}:${mongoDBPort}/?authSource=${mongoDBDBName}`,
    dbName: mongoDBDBName
  }
}