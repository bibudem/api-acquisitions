import axios from 'axios'
import config from 'config'
import console from './console.js'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/*
 * getThumbnailLink
 */
export async function getThumbnailLink(isbns, type) {
  let lien = null

  if (isbns) {
    // D'abord on récupère l'image de syndetics
    for (let i = 0; i < isbns.length; i++) {
      let isbn = isbns[i]
      console.debug(`Looking for images from Syndetics for isbn ${isbn}`)
      lien = await fetchThumbnailLinkFromSyndetics(isbn)
      if (lien) {
        console.debug(`Found one`)
        break
      }
    }
    // s'il n'y a pas dans syndetics on la récupère de google
    if (lien == null) {
      //console.log("aucune image from syndetics")
      for (let i = 0; i < isbns.length; i++) {
        let isbn = isbns[i]
        console.debug(`Looking for images from Google for isbn ${isbn}`)
        await sleep(50)
        lien = await fetchThumbnailLinkFromGoogleBooksApi(isbn)
        if (lien) {
          console.debug(`Found one`)
          break
        }
      }

    }
  }

  // sinon on prend l'image par défaut
  if (!lien) {
    console.debug(`Did not find any thumbnail, resolving to default image`)
    lien = getDefaultImage(type)
  }
  return lien
}

// return urls de l'image de la couverture (3 formats?)
async function fetchThumbnailLinkFromSyndetics(isbn) {
  const url = `https://syndetics.com/index.aspx?isbn=${isbn}/SC.JPG`

  try {
    const res = await axios.get(url)
    //console.log("response syndetics", res)
    // On vérifie que la taille de l'image est différente de la taille de l'image par défaut
    if (res.status === 200 && res.headers['content-length'] != 86) {
      return url
    }
    return null

  } catch (error) {
    console.error('Erreur function fetchThumbnailLinkFromSyndetics - isbn = ' + isbn + ' erreur: ', error)
    return undefined
  }
}

// return urls de l'image de la couverture (3 formats?)
async function fetchThumbnailLinkFromGoogleBooksApi(isbn) {

  const url = new URL('https://www.googleapis.com/books/v1/volumes?country=CA')
  url.searchParams.set('q', `isbn:${isbn}`)
  url.searchParams.set('fields', 'totalItems,items(volumeInfo/imageLinks/smallThumbnail)')
  url.searchParams.set('apiKey', config.get('googleBooksApi.key'))

  try {
    // console.log('Querying Google Books API...')
    const res = await axios.get(url)
    if (res.status === 200 && res.data.totalItems === 1) {
      console.log(JSON.stringify(res.data, null, 2))
    }
    if (res.status === 200 && res.data.totalItems === 1 && res.data.items?.[0]?.volumeInfo?.imageLinks) {
      let lien = res.data.items[0].volumeInfo.imageLinks.smallThumbnail
      if (lien.indexOf("http://") !== -1) {
        lien = lien.replace("http://", "https://")
      }
      return lien
    }

    return null

  } catch (error) {
    console.error('Error fetching Google Books API with isbn = ' + isbn)

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log('Response status: ' + error.response.status + ' - ' + error.response.statusText)
      console.log('Response headers: ' + error.response.headers)
      console.log('Response data: ' + error.response.data)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log('Request: ' + error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error: ' + error.message)
    }
    console.log('Config: ' + error.config)

    return null
  }
}

/*
 * getDefaultImage
 */
function getDefaultImage(type) {

  switch (type) {
    case 'vidéo':
      type = 'file-movie'
      break

    case 'partition':
      type = 'file-musical-score'
      break

    case 'périodique':
      type = 'newspaper'
      break

    case 'enregistrement sonore':
      type = 'file-sound'
      break

    case 'livre':
      type = 'book'
      break

    case 'image':
      type = 'file-picture'
      break

    default:
      type = "file-text"
  }

  return `${config.get('apiBaseUrl')}/icons/${type.toLowerCase()}.png`
}