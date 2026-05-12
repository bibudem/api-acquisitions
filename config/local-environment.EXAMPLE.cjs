const { join } = require('path')

const MONGODB_PORT = '27017'
const MONGODB_HOSTNAME = '127.0.0.1'
const MONGODB_USER_NAME = 'user'
const MONGODB_USER_PWD = 'pwd'
const MONGODB_DB_NAME = 'nacq'

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
    url: `mongodb://${MONGODB_USER_NAME}:${encodeURIComponent(MONGODB_USER_PWD)}@${MONGODB_HOSTNAME}:${MONGODB_PORT}/?authSource=${MONGODB_DB_NAME}`,
    dbName: MONGODB_DB_NAME
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