export function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message || err)

  const status = err.status || 500
  const message = status === 500 ? 'Interner Serverfehler' : err.message

  res.status(status).json({ error: message })
}
