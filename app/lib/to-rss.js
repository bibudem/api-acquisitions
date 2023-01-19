import RSS from 'rss'
import config from 'config'

const longDateFormat = new Intl.DateTimeFormat(config.get('locale'), { dateStyle: 'long', timeZone: config.get('timeZone') })

const DISCIPLINES = config.get('disciplines').keys
const API_BASE_URL = config.get('apiBaseUrl')

export function toRSS(disciplineKey, posts) {
  const headers = Object.assign({}, config.get('rss.headers'))

  headers.title = `Nouveautés en ${DISCIPLINES.find(d => d.key === disciplineKey).label.toLowerCase()}${config.get('rss.titleSuffix')}`
  headers.pubDate = (new Date()).toISOString()
  headers.site_url = `${headers.site_url}/${disciplineKey}/nouveautes`
  headers.feed_url = `${API_BASE_URL}/disciplines/${disciplineKey}.rss`

  const rss = new RSS(headers)

  posts.forEach(post => {
    const {
      titre: title,
      url,
      datenouveaute: date,
      image
    } = post
    const auteurs = post.auteurs ? `<p>${post.auteurs.join(', ')}</p>` : ``
    const editeur = post.editeur ? `<p>${post.editeur}</p>` : ``
    const format = post.format ? `<p>${post.format}</p>` : ``
    const dateFormated = `<p><small>${longDateFormat.format(new Date(date))}</small></p>`
    const description = `<div style="display: flex">
  <div style="align-self: center"><img src='${image}' /></div>
  <div>
    ${auteurs}
    ${editeur}
    ${format}
    ${dateFormated}
  </div>
</div>`
    const campainUrl = new URL(url)
    campainUrl.searchParams.set('utm_campaign', config.get('rss.analytics.utm_campaign'))
    campainUrl.searchParams.set('utm_medium', config.get('rss.analytics.utm_medium'))
    campainUrl.searchParams.set('utm_source', disciplineKey)

    rss.item({
      title,
      url: campainUrl.href,
      guid: url,
      date,
      description,
      image,
      enclosure: {
        url: image
      }
    })
  })

  return rss.xml()
}