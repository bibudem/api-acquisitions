import pkg from '../../package.json' assert {type: 'json'}

export function getAbout(req, res) {
  res.send(`<pre>${pkg.name} v${pkg.version} (${process.env.NODE_ENV})
<p><a href="api-doc">Documentation</a> | <a href="${pkg.homepage}">Sources</a></p></pre>`)
}