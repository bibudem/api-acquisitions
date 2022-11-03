import axios from 'axios'
import Cache from 'ttl'
import { camelCase } from 'camel-case'
import isMain from 'is-main'
import config from 'config'

import console from './console.js'

const authConfig = config.get('oclcAuth')

function wait(n) {
  return new Promise(resolve => {
    setTimeout(resolve, n)
  })
}

export class AccessToken {
  constructor({
    grantType = 'client_credentials',
    scope,
    wskey = config.get('oclcScimAPIKey.key'),
    wskeySecret = config.get('oclcScimAPIKey.secret'),
    tokenHost = 'https://oauth.oclc.org',
    tokenPath = '/token',
    expiresAt = null,
    authenticatingInstitutionId = null,
    contextInstitutionId = null,
    httpClientTimeout = config.get('httpClient.timeout'),
    proxy = config.get('httpClient.proxy')

  } = {}) {
    this.grantType = grantType;
    this.tokenHost = tokenHost;
    this.tokenPath = tokenPath;
    this.scope = scope;
    this.wskey = wskey;
    this.wskeySecret = wskeySecret;

    // Token data
    this.expiresAt = expiresAt;
    this.authenticatingInstitutionId = authenticatingInstitutionId;
    this.contextInstitutionId = contextInstitutionId;
    this.tokenType = null;
    this.httpClientTimeout = httpClientTimeout;
    this.proxy = proxy;
    this.cache = new Cache({
      capacity: 1
    })
    this.client = axios;
  }

  async requestAccessToken({ grantType = this.grantType } = {}) {

    if (this.cache.get('token')) {
      return this.cache.get('token')
    }

    // Token is expired. Need to get a new one

    const responsePromise = new Promise((resolve, reject) => {

      const url = new URL(this.tokenHost + this.tokenPath)
      url.searchParams.set('grant_type', grantType)
      url.searchParams.set('scope', normalizeScope(this.scope))

      axios.post(this.tokenHost + this.tokenPath, {}, {
        params: {
          grant_type: grantType,
          scope: normalizeScope(this.scope)
        },
        auth: {
          username: this.wskey,
          password: this.wskeySecret
        },
        timeout: this.httpClientTimeout
      })
        .then(response => {

          const data = {}
          Object.keys(response.data).forEach(key => data[camelCase(key)] = response.data[key])

          if (response.status === 200) {
            // Success

            if (config.get('oclcAPI.useCache') && typeof this.cache.get('token') === 'undefined') {
              this.cache.put('token', new Promise((resolve) => { resolve(data) }), ((data.expiresIn - 60) * 1000) || 10 * 60 * 1000);
            }

            return resolve(data);
          }

          console.debug('Failed: Got a status code of ' + response.status)

          reject(data);
        })
        .catch((e) => {
          console.debug('Failed: Could not get a token')
          console.error(Object.keys(e))
          console.error(e.response)
          const reason = new Error('data' in e ? e.data : 'errno' in e ? e.errno : e)
          reject(reason);
        })
    })

    return responsePromise;
  }


  async _doCreate() {
    console.debug('- request')
    return new Promise(async (resolve, reject) => {
      try {
        const token = await this.requestAccessToken();

        if (token && 'status' in token && token.status !== '200') {
          return reject(token)
        }

        resolve(token);

      } catch (e) {
        reject(e)
      }
    })
  }

  async create({ trial = 1, maxTrials = authConfig.tokenTrials, interval = authConfig.tokenTrialsInterval } = {}) {

    return new Promise(async (resolve, reject) => {
      console.log('trial #' + trial)
      let token = null;

      try {
        token = await this._doCreate(maxTrials)
        console.debug('token created at trial #' + trial)
        resolve(token);
      } catch (e) {
        console.warn('token creation trial #' + trial + ' failed with error ')
        console.warn(e)

        trial++;

        if (trial <= maxTrials) {
          await wait(interval);
          try {
            return await this.create({ trial, maxTrials, interval });
          } catch (e) { }
        } else {
          const err = new Error(`Could not create access token after ${maxTrials} trials. ${e.message}`)
          console.error(err)
          reject(err);
        }
      }

    })
  }

  /**
    * Determines if the current access token has already expired or if it is about to expire
    *
    * @param {Number} expirationWindowSeconds Window of time before the actual expiration to refresh the token
    * @returns {Boolean}
    */

  isExpired(expirationWindowSeconds = 0) {
    if (this.expiresAt) {
      expirationWindowSeconds = expirationWindowSeconds * 1000;
      console.log(new Date(this.expiresAt) - Date.now())
      return new Date(this.expiresAt) - Date.now() <= expirationWindowSeconds;
    }
    return true;
  }
}

function normalizeScope(scope) {
  // Build a space separated scope list from an array of scopes.
  let normalizedScope = "";
  if (scope && Array.isArray(scope)) {
    for (let i = 0; i < scope.length; i++) {
      normalizedScope += scope[i];
      if (i !== scope.length - 1) {
        normalizedScope += " ";
      }
    }
  }
  return normalizedScope;
}

//
// ====================================================
//

if (isMain(import.meta)) {
  (async () => {
    const maxTrials = 10,
      interval = 1500,
      result = {
        success: 0,
        fail: 0
      }

    await doTrial(0);

    async function doTrial(trial) {
      trial++;
      if (trial > maxTrials) {
        console.log('End test')
        console.log(result)
      }
      else {
        console.log(`Round ${trial}`)

        // const t = new AccessToken({ scope: ['configPlatform context:263683', 'WorldCatMetadataAPI', 'refresh_token'] })
        const t = new AccessToken({
          scope: ['SCIM']
        })
        try {
          const data = await t.create();
          result.success++;
          console.log('success')
          // console.log(data)
        } catch (e) {
          result.fail++;
          console.log('error')
          console.error('data' in e ? e.data : 'errno' in e ? e.errno : e)
        }

        setTimeout(() => {
          doTrial(trial)
        }, interval)

      }
    }
  })()
}