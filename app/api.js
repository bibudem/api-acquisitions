import { initialize } from 'express-openapi'
import apiSchema from '../config/schemas/api-acquisitions.json' assert {type: 'json'}
import errorsSchema from '../config/schemas/errors.json' assert {type: 'json'}
import { about } from './controllers/about.controller.js'
import { get, getByDiscipline } from './controllers/nacq.controller.js'
import { getListeDisciplines } from './controllers/disciplines.controller.js'
import { errorMiddleware, responseValidationHandler } from './middlewares/error.middleware.js'
import { inspect } from './lib/inspect.js'

export async function initializeApi(app) {
  await initialize({
    apiDoc: {
      ...apiSchema,
      'x-express-openapi-additional-middleware': [
        (req, res, next) => {
          console.log(`url: ${req.url}`)
          next()
        },
        responseValidationHandler
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
      get,
      about,
      getByDisciplineOld: get,
      getByDiscipline: get,
      getByDisciplineRSS: get,
      getListeDisciplines,
      validationFail: async (req, res) => res.status(400).json({ err: c.validation.errors }),
      notFound: async (req, res) => res.status(404).json({ err: 'not found' }),
    }
  })
}