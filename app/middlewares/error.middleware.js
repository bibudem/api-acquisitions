import config from 'config'

const prodEnv = process.env.NODE_ENV.endsWith('production')

export function errorMiddleware(error, req, res, next) {

  // Object error
  if (error !== null && typeof error === 'object') {

    // Response validation error
    if (Reflect.has(error, 'responseValidationError')) {
      if (prodEnv) {
        return res.status(500).json({ status: 'error', message: 'Something bad happened' })
      }

      const status = error.status
      const message = error.responseValidationError.message

      return res.status(error.status).json({ status, message, data: error.responseValidationError });
    }

    // Request validation error
    if (Reflect.has(error, 'status') && Reflect.has(error, 'errors')) {
      const message = error.errors.map(error => `The ${error.path} ${error.location} parameter ${error.message}.`).join(' ')
      return res.status(error.status).json({
        status: error.status,
        message,
        data: error.errors
      })
    }

    // Default case for object errors
    console.warn('Uncatched object error: ', error)
    res.status(error.status || 500).json(error)
  }

  // Default error handler
  console.warn('Uncatched error: ', error)
  res.status(500).json({
    message: 'Something bad appened'
  })
}

export function defaultJSONHandler(req, res, next) {
  // Final response handler

  console.log('env: ', req.app.get('env'))
  const url = new URL(req.originalUrl, `${config.get('apiBaseUrl')}/`)
  res.status(404).json({
    status: 404,
    message: `Cannot ${req.method} ${url.pathname}`
  })
}