export function errorHandler(err, req, res, next) {
  console.error(`[${req.method} ${req.path}]`, err.stack || err.message || err)

  const status = err.status || 500
  const message = err.message || 'Interner Serverfehler'

  res.status(status).json({ error: message })
}
