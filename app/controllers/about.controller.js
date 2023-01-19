import pkg from '../../package.json' assert {type: 'json'}

export function about(req, res) {
  res.set('Content-Type', 'text/plain').send(`${pkg.name} v${pkg.version} (${process.env.NODE_ENV})`)
}