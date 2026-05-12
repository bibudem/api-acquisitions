import config from 'config'
import { initializeApi } from '@bibudem/api-communs'
import pkg from '../../package.json' assert {type: 'json'}
import apiSchema from '../../config/schemas/openapi-schema.json' assert {type: 'json'}
import { getNacq } from '../controllers/nacq.controller.js'
import { getIcon } from '../controllers/icon.controller.js'
import { getListeDisciplines } from '../controllers/disciplines.controller.js'

const operations = {
  getNacq,
  getByDisciplineOld: getNacq,
  getByDisciplineOldRSS: getNacq,
  getByDiscipline: getNacq,
  getByDisciplineRSS: getNacq,
  getListeDisciplines,
  getIcon,
  getOldIcon: getIcon
}

export const apiRoutes = await initializeApi({
  apiSchema,
  apiBaseUrl: config.get('apiBaseUrl'),
  operations,
  pkg
})