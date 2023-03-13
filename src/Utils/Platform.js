
// Utis
const Auth = require('./Auth')
const provPlatformDebug = require('debug')('provider:platform')

/**
 * @description Class representing a registered platform.
 */
class Platform {
  #platformName

  #platformUrl

  #clientId

  #authenticationEndpoint

  #authConfig

  #ENCRYPTIONKEY

  #accesstokenEndpoint

  #authorizationServer

  #kid

  #Database

  /**
     * @param {string} name - Platform name.
     * @param {string} platformUrl - Platform url.
     * @param {string} clientId - Client Id generated by the platform.
     * @param {string} authenticationEndpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {string} accesstokenEndpoint - Access token endpoint for the platform.
     * @param {string} authorizationServer - Authorization server identifier to be used as the aud when requesting an access token. If not specified, the access token endpoint URL will be used.
     * @param {string} kid - Key id for local keypair used to sign messages to this platform.
     * @param {string} _ENCRYPTIONKEY - Encryption key used
     * @param {Object} _authConfig - Authentication configurations for the platform.
     */
  constructor (name, platformUrl, clientId, authenticationEndpoint, accesstokenEndpoint, authorizationServer, kid, _ENCRYPTIONKEY, _authConfig, Database) {
    this.#authConfig = _authConfig
    this.#ENCRYPTIONKEY = _ENCRYPTIONKEY
    this.#platformName = name
    this.#platformUrl = platformUrl
    this.#clientId = clientId
    this.#authenticationEndpoint = authenticationEndpoint
    this.#accesstokenEndpoint = accesstokenEndpoint
    this.#authorizationServer = authorizationServer
    this.#kid = kid
    this.#Database = Database
  }

  /**
   * @description Gets the platform url.
   */
  async platformUrl () {
    return this.#platformUrl
  }

  /**
   * @description Gets the platform client id.
   */
  async platformClientId () {
    return this.#clientId
  }

  /**
     * @description Sets/Gets the platform name.
     * @param {string} [name] - Platform name.
     */
  async platformName (name) {
    if (!name) return this.#platformName
    await this.#Database.Modify(false, 'platform', { platformUrl: this.#platformUrl, clientId: this.#clientId }, { platformName: name })
    this.#platformName = name
    return name
  }

  /**
     * @description Gets the platform Id.
     */
  async platformId () {
    return this.#kid
  }

  /**
   * @description Gets the platform key_id.
   */
  async platformKid () {
    return this.#kid
  }

  /**
   * @description Sets/Gets the platform status.
   * @param {Boolean} [active] - Whether the Platform is active or not.
   */
  async platformActive (active) {
    if (active === undefined) {
      // Get platform status
      const platformStatus = await this.#Database.Get(false, 'platformStatus', { id: this.#kid })
      if (!platformStatus || platformStatus[0].active) return true
      else return false
    }
    await this.#Database.Replace(false, 'platformStatus', { id: this.#kid }, { id: this.#kid, active })
    return active
  }

  /**
     * @description Gets the RSA public key assigned to the platform.
     *
     */
  async platformPublicKey () {
    const key = await this.#Database.Get(this.#ENCRYPTIONKEY, 'publickey', { kid: this.#kid })
    return key[0].key
  }

  /**
     * @description Gets the RSA private key assigned to the platform.
     *
     */
  async platformPrivateKey () {
    const key = await this.#Database.Get(this.#ENCRYPTIONKEY, 'privatekey', { kid: this.#kid })
    return key[0].key
  }

  /**
     * @description Sets/Gets the platform authorization configurations used to validate it's messages.
     * @param {string} method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {string} key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
  async platformAuthConfig (method, key) {
    if (!method && !key) return this.#authConfig

    if (method && method !== 'RSA_KEY' && method !== 'JWK_KEY' && method !== 'JWK_SET') throw new Error('INVALID_METHOD. Details: Valid methods are "RSA_KEY", "JWK_KEY", "JWK_SET".')

    const authConfig = {
      method: method || this.#authConfig.method,
      key: key || this.#authConfig.key
    }

    await this.#Database.Modify(false, 'platform', { platformUrl: this.#platformUrl, clientId: this.#clientId }, { authConfig })
    this.#authConfig = authConfig
    return authConfig
  }

  /**
   * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint - Platform authentication endpoint.
   */
  async platformAuthenticationEndpoint (authenticationEndpoint) {
    if (!authenticationEndpoint) return this.#authenticationEndpoint
    await this.#Database.Modify(false, 'platform', { platformUrl: this.#platformUrl, clientId: this.#clientId }, { authEndpoint: authenticationEndpoint })
    this.#authenticationEndpoint = authenticationEndpoint
    return authenticationEndpoint
  }

  /**
     * @description Sets/Gets the platform access token endpoint used to authenticate messages to the platform.
     * @param {string} [accesstokenEndpoint] - Platform access token endpoint.
     */
  async platformAccessTokenEndpoint (accesstokenEndpoint) {
    if (!accesstokenEndpoint) return this.#accesstokenEndpoint
    await this.#Database.Modify(false, 'platform', { platformUrl: this.#platformUrl, clientId: this.#clientId }, { accesstokenEndpoint })
    this.#accesstokenEndpoint = accesstokenEndpoint
    return accesstokenEndpoint
  }

  /**
   * @description Sets/Gets the platform authorization server identifier used as the aud claim when requesting access tokens.
   * @param {string} [authorizationServer] - authorization server identifier.
   */
  async platformAuthorizationServer (authorizationServer) {
    if (!authorizationServer) return this.#authorizationServer || this.#accesstokenEndpoint
    await this.#Database.Modify(false, 'platform', { platformUrl: this.#platformUrl, clientId: this.#clientId }, { authorizationServer })
    this.#authorizationServer = authorizationServer
    return authorizationServer
  }

  /**
     * @description Gets the platform access token or attempts to generate a new one.
     * @param {String} scopes - String of scopes.
     */
  async platformAccessToken (scopes) {
    const result = await this.#Database.Get(this.#ENCRYPTIONKEY, 'accesstoken', { platformUrl: this.#platformUrl, clientId: this.#clientId, scopes })
    let token
    if (!result || (Date.now() - result[0].createdAt) / 1000 > result[0].token.expires_in) {
      provPlatformDebug('Valid access_token for ' + this.#platformUrl + ' not found')
      provPlatformDebug('Attempting to generate new access_token for ' + this.#platformUrl)
      provPlatformDebug('With scopes: ' + scopes)
      token = await Auth.getAccessToken(scopes, this, this.#ENCRYPTIONKEY, this.#Database)
    } else {
      provPlatformDebug('Access_token found')
      token = result[0].token
    }
    token.token_type = token.token_type.charAt(0).toUpperCase() + token.token_type.slice(1)
    return token
  }

  /**
   * @description Retrieves the platform information as a JSON object.
   */
  async platformJSON () {
    const platformJSON = {
      id: this.#kid,
      url: this.#platformUrl,
      clientId: this.#clientId,
      name: this.#platformName,
      authenticationEndpoint: this.#authenticationEndpoint,
      accesstokenEndpoint: this.#accesstokenEndpoint,
      authorizationServer: this.#authorizationServer || this.#accesstokenEndpoint,
      authConfig: this.#authConfig,
      publicKey: await this.platformPublicKey(),
      active: await this.platformActive()
    }
    return platformJSON
  }

  /**
   * @description Deletes a registered platform.
   */
  async delete () {
    await this.#Database.Delete('platform', { platformUrl: this.#platformUrl, clientId: this.#clientId })
    await this.#Database.Delete('platformStatus', { id: this.#kid })
    await this.#Database.Delete('publickey', { kid: this.#kid })
    await this.#Database.Delete('privatekey', { kid: this.#kid })
    return true
  }

  /* istanbul ignore next */
  /**
   * @deprecated
   */
  async remove () {
    console.log('Deprecation warning: The Platform.remove() method is now deprecated and will be removed in the 6.0 release. Use Platform.delete() instead.')
    return this.delete()
  }

  /* istanbul ignore next */
  /**
   * @description Sets/Gets the platform authorization endpoint used to perform the OIDC login.
   * @param {string} [authenticationEndpoint] - Platform authentication endpoint.
   * @deprecated
   */
  async platformAuthEndpoint (authenticationEndpoint) {
    return this.platformAuthenticationEndpoint(authenticationEndpoint)
  }
}

module.exports = Platform
