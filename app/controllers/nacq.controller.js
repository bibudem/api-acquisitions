
import config from 'config'
import { Nacq } from '../models/nacq.js'
import { toRSS } from '../lib/to-rss.js'

export async function getNacq(req, res, next) {

  const format = (req.params.format || req.query.format) ?? 'json'
  const discipline = req.params.discipline || req.query.discipline

  try {
    const result = await Nacq.get({ discipline, limite: req.query.limite, periode: req.query.periode })
    if (format === 'json') {
      // JSON format
      return res.json(result)
    }

    const feedUrl = config.get('apiBaseUrl') + req.url
    const rss = toRSS(discipline, feedUrl, result)

    // RSS format
    res.set('Content-Type', 'application/rss+xml').send(rss)
  } catch (error) {
    next(error)
  }
}