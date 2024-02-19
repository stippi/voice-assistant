import {LoginFlow} from "../utils/loginFlow.ts";
import {GoogleClientId, GoogleClientSecret} from "../secrets.ts";

export const loginFlow = new LoginFlow(
  "https://accounts.google.com/o/oauth2/v2/auth",
  {
    "access_type": "offline",
    "include_granted_scopes": "true",
    "prompt": "consent",
  },
  "https://oauth2.googleapis.com/token",
  {
    "client_secret": GoogleClientSecret
  },
  "/google-callback",
  GoogleClientId,
  [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/cloud-platform"
  ],
  "google"
);
