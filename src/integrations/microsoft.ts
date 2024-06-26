import {LoginFlow} from "../utils/loginFlow";
import {MicrosoftClientId} from "../config";

export const loginFlow = new LoginFlow({
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  additionalParams: {
  },
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  additionalTokenParams: {
  },
  callbackPath: "/microsoft-callback",
  clientId: MicrosoftClientId,
  scopes: [
    "User.Read",
    "Calendars.ReadWrite",
  ],
  storagePrefix: "microsoft"
});
