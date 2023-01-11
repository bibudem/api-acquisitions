import pkg from '../../package.json' assert {type: 'json'}

export function about(req, res) {
  res.send(`${pkg.name} v${pkg.version} (${process.env.NODE_ENV})`)
}