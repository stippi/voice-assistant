type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expires: number;
};

interface Options {
  authorizationEndpoint: string;
  additionalParams: Record<string, string>;
  tokenEndpoint: string;
  additionalTokenParams: Record<string, string>;
  callbackPath: string;
  clientId: string;
  scopes: string[];
  storagePrefix: string;
}

export class LoginFlow {
  options: Options;
  redirectUrl: string;

  constructor(options: Options) {
    this.options = options;
    this.redirectUrl = window.origin + options.callbackPath;
  }

  private codeVerifierKey() {
    return `${this.options.storagePrefix}-code-verifier`;
  }

  private tokenSetKey() {
    return `${this.options.storagePrefix}-token-set`;
  }

  private stateKey() {
    return `${this.options.storagePrefix}-state`;
  }

  private getRandomString(length: number): string {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");
  }

  async redirectToAuthorize() {
    const codeVerifier = this.getRandomString(64);
    const data = new TextEncoder().encode(codeVerifier);
    const hashed = await crypto.subtle.digest("SHA-256", data);
    const state = this.getRandomString(16);

    const codeChallengeBase64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    window.localStorage.setItem(this.codeVerifierKey(), codeVerifier);
    window.localStorage.setItem(this.stateKey(), state);

    const params = {
      ...this.options.additionalParams,
      response_type: "code",
      client_id: this.options.clientId,
      scope: this.options.scopes.join(" "),
      code_challenge_method: "S256",
      code_challenge: codeChallengeBase64,
      state: state,
      redirect_uri: this.redirectUrl,
    };

    const authUrl = new URL(this.options.authorizationEndpoint);
    authUrl.search = new URLSearchParams(params).toString();
    // Redirect the user to the authorization server for login
    window.location.href = authUrl.toString();
  }

  async getToken(code: string) {
    const codeVerifier = localStorage.getItem(this.codeVerifierKey()) || "";

    const response = await fetch(this.options.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        ...this.options.additionalTokenParams,
        grant_type: "authorization_code",
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
    const code = args.get("code");
    if (!code) {
      console.log(`${this.options.storagePrefix}: no code found in URL, redirecting to authorize`);
      await this.redirectToAuthorize();
      return "";
    }
    const state = args.get("state");
    const storedState = window.localStorage.getItem(this.stateKey());
    window.localStorage.removeItem(this.stateKey());
    if (!storedState || state !== storedState) {
      console.log(`${this.options.storagePrefix}: state mismatch: ${state} !== ${storedState}`);
      await this.redirectToAuthorize();
      return "";
    }
    if (window.location.pathname !== this.options.callbackPath) {
      console.log(`${this.options.storagePrefix}: code found in URL, but not on ${this.options.callbackPath}`);
      // TODO: Would redirecting here interrupt another login flow?
      return "";
    }
    // If we find a code, we're in a callback, do a token exchange
    console.log(`${this.options.storagePrefix}: found code in URL, exchanging for access token`);
    try {
      const json = await this.getToken(code);
      console.log(`${this.options.storagePrefix}: received access token set`);
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

      const updatedUrl = url.search ? url.href : url.href.replace("?", "");
      window.history.replaceState({}, document.title, updatedUrl);

      return newTokenSet.accessToken;
    } catch (error) {
      console.error(`${this.options.storagePrefix}: failed to exchange code for token`, error);
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
    const response = await fetch(this.options.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        ...this.options.additionalTokenParams,
        client_id: this.options.clientId,
        grant_type: "refresh_token",
        refresh_token: tokenSet.refreshToken,
      }),
    });
    if (!response.ok) {
      // If we failed to refresh the token, re-run the login flow
      console.error(`${this.options.storagePrefix}: failed to refresh token!`);
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
