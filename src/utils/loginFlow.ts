type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expires: number;
};

export class LoginFlow {
  redirectUrl: string;
  authorizationEndpoint: string;
  additionalParams: Record<string, string>;
  tokenEndpoint: string;
  additionalTokenParams: Record<string, string>;
  callbackPath: string;
  clientId: string;
  scopes: string[];
  storagePrefix: string;
  
  constructor(
    authorizationEndpoint: string,
    additionalParams: Record<string, string>,
    tokenEndpoint: string,
    additionalTokenParams: Record<string, string>,
    callbackPath: string,
    clientId: string,
    scopes: string[],
    storagePrefix: string
  ) {
    this.redirectUrl = window.origin + callbackPath;
    this.authorizationEndpoint = authorizationEndpoint;
    this.additionalParams = additionalParams;
    this.tokenEndpoint = tokenEndpoint;
    this.additionalTokenParams = additionalTokenParams;
    this.callbackPath = callbackPath;
    this.clientId = clientId;
    this.scopes = scopes;
    this.storagePrefix = storagePrefix;
  }
  
  private codeVerifierKey() {
    return `${this.storagePrefix}-code-verifier`;
  }
  
  private tokenSetKey() {
    return `${this.storagePrefix}-token-set`;
  }
  
  private stateKey() {
    return `${this.storagePrefix}-state`;
  }
  
  private getRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");
  }
  
  async redirectToAuthorize() {
    const codeVerifier = this.getRandomString(64);
    const data = new TextEncoder().encode(codeVerifier);
    const hashed = await crypto.subtle.digest('SHA-256', data);
    const state = this.getRandomString(16)
    
    const codeChallengeBase64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    window.localStorage.setItem(this.codeVerifierKey(), codeVerifier);
    window.localStorage.setItem(this.stateKey(), state);
    
    const params = {
      ...this.additionalParams,
      response_type: 'code',
      client_id: this.clientId,
      scope: this.scopes.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallengeBase64,
      state: state,
      redirect_uri: this.redirectUrl,
    };
    
    const authUrl = new URL(this.authorizationEndpoint)
    authUrl.search = new URLSearchParams(params).toString();
    // Redirect the user to the authorization server for login
    window.location.href = authUrl.toString();
  }

  async getToken(code: string) {
    const codeVerifier = localStorage.getItem(this.codeVerifierKey()) || "";
    
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        ...this.additionalTokenParams,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUrl,
        code_verifier: codeVerifier,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to exchange code to access token. HTTP status: ${response.status}`);
    }
    return await response.json();
  }
  
  async runLoginFlow() {
    // On page load, try to fetch auth code from current browser search URL
    const args = new URLSearchParams(window.location.search);
    const code = args.get('code');
    if (!code) {
      console.log(`no code found in URL, redirecting to ${this.storagePrefix} authorize`);
      await this.redirectToAuthorize();
      return "";
    }
    const state = args.get('state');
    const storedState = window.localStorage.getItem(this.stateKey());
    window.localStorage.removeItem(this.stateKey());
    if (!storedState || state !== storedState) {
      console.log(`state mismatch: ${state} !== ${storedState}`);
      await this.redirectToAuthorize();
      return "";
    }
    if (window.location.pathname !== this.callbackPath) {
      console.log(`code found in URL, but not on ${this.callbackPath}`);
      // TODO: Would redirecting here interrupt another login flow?
      return "";
    }
    // If we find a code, we're in a callback, do a token exchange
    console.log(`found code in URL, exchanging for ${this.storagePrefix} access token`);
    try {
      const json = await this.getToken(code);
      console.log(`received ${this.storagePrefix} access token set`);
      const newTokenSet: TokenSet = {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expires: Date.now() + json.expires_in * 1000,
      };
      localStorage.setItem(this.tokenSetKey(), JSON.stringify(newTokenSet));
      
      // Remove query and callback path from URL so that we can refresh correctly.
      const url = new URL(window.location.href);
      url.search = "";
      url.pathname = "";
      
      const updatedUrl = url.search ? url.href : url.href.replace('?', '');
      window.history.replaceState({}, document.title, updatedUrl);
      
      return newTokenSet.accessToken;
    } catch (error) {
      console.error(`failed to exchange ${this.storagePrefix} code for token`, error);
      await this.redirectToAuthorize();
      return "";
    }
  }
  
  async getAccessToken(forceRefresh = false) {
    const storedTokenSet = localStorage.getItem(this.tokenSetKey());
    if (!storedTokenSet) {
      return await this.runLoginFlow();
    }
    const tokenSet: TokenSet = JSON.parse(storedTokenSet);
    if (!forceRefresh && tokenSet.expires > Date.now()) {
      return tokenSet.accessToken;
    }
    // Try to refresh the access token, it may fail if the refresh token has expired, too.
    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        ...this.additionalTokenParams,
        client_id: this.clientId,
        grant_type: 'refresh_token',
        refresh_token: tokenSet.refreshToken
      }),
    });
    if (!response.ok) {
      // If we failed to refresh the token, re-run the login flow
      console.error("failed to refresh token!")
      return await this.runLoginFlow();
    }
    const json = await response.json();
    const newTokenSet: TokenSet = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token || tokenSet.refreshToken,
      expires: Date.now() + json.expires_in * 1000,
    };
    localStorage.setItem(this.tokenSetKey(), JSON.stringify(newTokenSet));
    return newTokenSet.accessToken;
  }
}