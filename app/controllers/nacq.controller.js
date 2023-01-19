import { Nacq } from '../models/nacq.js'
import { toRSS } from '../lib/to-rss.js'

export async function get(req, res, next) {
  console.log('=== get')
  console.log('params: ', req.params)
  console.log('query: ', req.query)
  // res.json(await Nacq.get({ discipline: req.query.discipline, limite: req.query.limite, periode: req.query.periode }))

  const format = req.params.format ?? 'json'

  try {
    const result = await Nacq.get({ discipline: req.params.discipline || req.query.discipline, limite: req.query.limite, periode: req.query.periode })
    if (format === 'json') {
      // JSON format
      return res.json(result)
    }
    console.log('result.length: ' + result.length)
    const rss = toRSS(req.params.discipline, result)

    // RSS format
    res.set('Content-Type', 'application/rss+xml').send(rss)
  } catch (error) {
    next(error)
  }
}

export async function getByDiscipline(req, res, next) {
  console.log('=== getByDiscipline')
  console.log('params: ', req.params)
  const format = req.params.format ?? 'json'
  try {
    const result = await Nacq.get({ discipline: req.params.discipline, limite: req.query.limite, periode: req.query.periode })
    if (format === 'json') {
      // JSON format
      return res.json(result)
    }
    console.log('result.length: ' + result.length)
    const rss = toRSS(req.params.discipline, result)

    // RSS format
    res.set('Content-Type', 'application/rss+xml').send(rss)
  } catch (error) {
    next(error)
  }
}