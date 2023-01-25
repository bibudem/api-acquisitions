import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import config from 'config'
import apiSchema from '../../config/schemas/openapi-schema.json' assert { type: 'json'}
import errorsSchema from '../../config/schemas/errors.json' assert { type: 'json'}

export const apiDocRouter = new Router()

const swaggerUiOptions = {
  explorer: true,
  deepLinking: true,
  swaggerOptions: {
    urls: [
      {
        url: `${config.get('apiBaseUrl')}/schemas/openapi`,
        name: 'Acquisitions'
      },
      {
        url: `${config.get('apiBaseUrl')}/schemas/errors.json`,
        name: 'Errors'
      }
    ],
    displayRequestDuration: true,
  }
}

apiDocRouter.use('/schemas/openapi', (req, res) => res.json(apiSchema))
apiDocRouter.use('/schemas/errors.json', (req, res) => res.json(errorsSchema))
apiDocRouter.use('/api-doc', swaggerUi.serve)
apiDocRouter.get('/api-doc', swaggerUi.setup(null, swaggerUiOptions))