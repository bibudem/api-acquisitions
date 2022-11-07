import config from 'config'
import axios from 'axios'

import { AccessToken } from './access-token.js'
import console from './console.js'

const wskey = config.get('oclcSearchAPIKey');

export class OclcSearchService {
  constructor({
    serviceUrl = 'https://americas.discovery.api.oclc.org/worldcat/search/v2',
    key,
    secret,
  } = {}) {
    this.url = new URL(serviceUrl);

    this.key = key;
    this.secret = secret;
    this.accessToken = new AccessToken({
      scope: ['SCIM', 'wcapi'],
      wskey: wskey.key,
      wskeySecret: wskey.secret
    });
  }

  async getBibRecordByOclcNumber(oclcNumber) {

    return new Promise(async (resolve, reject) => {

      const url = new URL(this.url.href) // clone this.url
      url.pathname += `/bibs/${oclcNumber}`;

      try {
        const bearerToken = (await this.accessToken.requestAccessToken()).accessToken;

        let result = await axios(
          {
            url: url.href,
            headers: {
              Authorization: `Bearer ${bearerToken}`
            }
          }
        );

        resolve(result);

      } catch (e) {
        console.error(e)
        reject(e)
      }

    });
  }

  async getBibRecordsByOclcNumber(oclcNumbers) {

    return new Promise(async (resolve, reject) => {

      const limit = 50;
      const result = [];

      for (let i = 0; i < oclcNumbers.length; i += limit) {
        const url = new URL(this.url.href) // clone this.url
        const oclcNumbersSlice = oclcNumbers.slice(i, i + limit);

        let q = oclcNumbersSlice.map(oclcNumber => `no:(${oclcNumber})`)
        q = q.join(' OR ');
        url.pathname += `/bibs/`;
        url.searchParams.set('q', q);
        url.searchParams.set('limit', limit)

        try {
          const bearerToken = (await this.accessToken.requestAccessToken()).accessToken;

          console.info(`Requesting oclc numbers ${i} to ${i + limit}...`)

          const response = await axios(
            {
              url: url.href,
              headers: {
                Authorization: `Bearer ${bearerToken}`
              },
              proxy: false
            }
          );

          if (response.status === 200) {

            const partialResult = response.data

            if (partialResult.numberOfRecords > 0) {
              result.push(...partialResult.bibRecords);
            }
          } else {
            console.error(`Failed to retrieve oclc numbers ${i} to ${i + limit}.`)
          }
        } catch (e) {
          console.error(e)
          reject(e)
        }

      }

      resolve(result);

    });
  }

  async getHoldingByOclcNumber(oclcNumber) {

    const url = new URL(this.url.href) // clone this.url
    url.pathname += `/my-holdings/`;
    url.searchParams.set('oclcNumber', oclcNumber)

    try {
      const bearerToken = (await this.accessToken.requestAccessToken()).accessToken;

      const result = await axios(
        {
          url: url.href,
          headers: {
            Authorization: `Bearer ${bearerToken}`
          },
          proxy: false
        }
      );

      // console.debug(result)

      return result

    } catch (e) {
      console.error(e)
      return e;
    }

    // });
  }
}

//
// ====================================================
// Quick test
//

import isMain from 'is-main'
import { getOclcNumbersFromFile } from '../models/nacq.js'

if (isMain(import.meta)) {
  (async () => {

    const searchService = new OclcSearchService(wskey);

    try {
      const result = await searchService.getBibRecordByOclcNumber('1224186661');
      console.log(JSON.stringify(result, null, 2))
    } catch (e) {
      try {
        console.error(JSON.stringify(e, null, 2))
      } catch (_) {
        console.error(e)
      }
    }
  })()
}