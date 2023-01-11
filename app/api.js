import { initialize } from 'express-openapi'
import apiSchema from '../config/schemas/api-acquisitions.json' assert {type: 'json'}
import { about } from './controllers/about.controller.js'
import { get, getByDiscipline } from './controllers/nacq.controller.js'
import { getListeDisciplines } from './controllers/disciplines.controller.js'
import { defaultValuesMiddleware } from './middlewares/default-values.middleware.js'
import { inspect } from './utils/inspect.js'

function validateAllResponses(req, res, next) {
  const strictValidation = req.apiDoc['x-express-openapi-validation-strict'] ? true : false;
  if (typeof res.validateResponse === 'function') {
    const send = res.send;
    res.send = function expressOpenAPISend(...args) {
      const onlyWarn = !strictValidation;
      if (res.get('x-express-openapi-validation-error-for') !== undefined) {
        return send.apply(res, args);
      }
      const body = JSON.parse(args[0]);
      let validation = res.validateResponse(res.statusCode, body);
      let validationMessage;
      if (validation === undefined) {
        validation = { message: undefined, errors: undefined };
      }
      if (validation.errors) {
        const errorList = Array.from(validation.errors).map(_ => _.message).join(',');
        validationMessage = `Invalid response for status code ${res.statusCode}: ${errorList}`;
        console.warn(validationMessage, body);
        // Set to avoid a loop, and to provide the original status code
        res.set('x-express-openapi-validation-error-for', res.statusCode.toString());
      }
      if (onlyWarn || !validation.errors) {
        return send.apply(res, args);
      } else {
        res.status(500);
        return res.json({
          status: 500,
          error: validationMessage
        });
      }
    }
  }
  next();
}

export async function initializeApi(app) {
  await initialize({
    apiDoc: {
      ...apiSchema,
      'x-express-openapi-additional-middleware': [
        (req, res, next) => {
          console.log(`url: ${req.url}`)
          next()
        },
        validateAllResponses
      ],
      'x-express-openapi-validation-strict': true
    },
    app,
    enableObjectCoercion: true,
    promiseMode: true,
    errorMiddleware: function (err, req, res, next) {
      console.log(err.constructor.name)
      console.error(err)
      res.status(err.status).json(err);
    },
    operations: {
      get,
      about,
      getByDisciplineOld: getByDiscipline,
      getByDiscipline,
      getListeDisciplines,
      validationFail: async (req, res) => res.status(400).json({ err: c.validation.errors }),
      notFound: async (req, res) => res.status(404).json({ err: 'not found' }),
    }
  })
}