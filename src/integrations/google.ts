import {LoginFlow} from "../utils/loginFlow.ts";
import {GoogleClientId, GoogleClientSecret} from "../secrets.ts";

export const loginFlow = new LoginFlow({
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  additionalParams: {
    "access_type": "offline",
    "include_granted_scopes": "true",
    "prompt": "consent",
  },
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  additionalTokenParams: {
    "client_secret": GoogleClientSecret
  },
  callbackPath: "/google-callback",
  clientId: GoogleClientId,
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/cloud-platform"
  ],
  storagePrefix: "google"
});
