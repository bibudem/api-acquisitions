import { initialize } from 'express-openapi'
import apiSchema from '../config/schemas/openapi-schema.json' assert {type: 'json'}
import errorsSchema from '../config/schemas/errors.json' assert {type: 'json'}
import { getAbout } from './controllers/about.controller.js'
import { getNacq } from './controllers/nacq.controller.js'
import { getIcon } from './controllers/icon.controller.js'
import { getListeDisciplines } from './controllers/disciplines.controller.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { responseValidationMiddleware } from './middlewares/response-validation.middleware.js'

export async function initializeApi(app) {
  await initialize({
    apiDoc: {
      ...apiSchema,
      'x-express-openapi-additional-middleware': [
        responseValidationMiddleware
      ],
      'x-express-openapi-validation-strict': true
    },
    app,
    enableObjectCoercion: true,
    promiseMode: true,
    errorMiddleware,
    externalSchemas: {
      'errors.json': errorsSchema
    },
    operations: {
      getNacq,
      getAbout,
      getByDisciplineOld: getNacq,
      getByDisciplineOldRSS: getNacq,
      getByDiscipline: getNacq,
      getByDisciplineRSS: getNacq,
      getListeDisciplines,
      getIcon,
    }
  })
}