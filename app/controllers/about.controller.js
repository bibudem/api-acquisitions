import pkg from '../../package.json' assert {type: 'json'}

export function getAbout(req, res) {
  res.send(`<h1>${pkg.name} v${pkg.version} <small>(${process.env.NODE_ENV})</small></h1><p><a href="api-doc">Documentation</a> | <a href="${pkg.homepage}">Sources</a></p>`)
}