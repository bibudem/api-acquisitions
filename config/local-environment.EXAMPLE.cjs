const { join } = require('path')

const mongoDBPort = '123'
const mongoDBHostname = 'localhost'
const mongoDBUser = 'user'
const mongoDBPw = 'pwd'
const mongoDBDBName = 'nacq'

module.exports = {
  apiBaseUrl: 'https://api.example.com/acquisitions',
  log: {
    level: 'debug'
  },
  server: {
    port: 8000
  },
  httpClient: {
    proxy: 'http://proxy.example.com:80',
    timeout: 30000
  },
  oclcNumbersFilePath: join(__dirname, '..', 'data', 'some-file-with-oclc-numbers'),
  mongodb: {
    url: `mongodb://${mongoDBUser}:${mongoDBPw}@${mongoDBHostname}:${mongoDBPort}/?authSource=${mongoDBDBName}`,
    dbName: mongoDBDBName
  },
  oclcApi: {
    scim: {
      key: '<WorldShare Identity Management API key>',
      secret: '<WorldShare Identity Management API secret>',
      institution: '<OCLC institution (registry) id ex: 1234>',
    },
    search: {
      key: '<WorldCat Search API v.2 key>',
      secret: '<WorldCat Search API v.2 secret>',
    },
  },
  googleBooksApi: {
    key: "<Google Books API key>",
  }
}