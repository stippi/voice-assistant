# Voice Assistant

Start a spoken ChatGPT conversation by activation word in your browser.

This project was bootstrapped using `npm create vite@latest ./ -- --template react-ts`.

## Running Locally

Create a file named `secrets.ts` in the `src` directory with the following contents:

```typescript
export const OpenAiConfig = {
  apiKey: "<Your platform.openai.com API key>",
  dangerouslyAllowBrowser: true
};

export const PicoVoiceAccessKey = "<Your picovoice.ai Access key>";

export const OpenWeatherMapApiKey = "<Your openweathermap.org API key>";

export const NewsApiOrgKey = "<Your newsapi.org API key>";

export const GoogleApiKey = "<Your googleapis.com API key>";
export const GoogleClientId = "XXX.apps.googleusercontent.com";
```

:bulb: **This file is ignored by git.**

In order to use the GPT-4 model, your `platform.openai.com` account must have billing information and one successful payment.
You can now manually initiate a payment via "Buy credits" on the [billing overview page](https://platform.openai.com/account/billing/overview).

The API key for `openweathermap.org` can be for the free tier.

Similarly, the API key for `picovoice.ai` is free to obtain for personal use.
It just comes with a rate limit. 

The API key for the Google APIs needs to have the following APIs enabled:

- Maps JavaScript API
- Places API (New)
- Routes API
- Directions API
- Google Calendar API (if you plan to activate the Google Integration, see below)

### Google Integration

For the optional Google Calendar integration (enabled in the Assistant Settings via the switch `Google Integration`), you need to provide a GoogleClientId.
The reason is that you need to log in with your Google account, and this requires setting up an OAuth2 Client of type `Web Application` on the Google cloud console for your project.
A number of things need to be configured:

- Create an `OAuth 2.0-Client-ID`:
  - Add both `http://localhost:5173` and `http://localhost` to the authorized Javascript origins.
  - Add both `http://localhost:5173` and `http://localhost` to the authorized redirection URIs (not entirely sure if this is indeed necessary).
- *Edit* the `OAuth Consent Screen`:
  - Set the start page to `http://localhost:5173` (not sure if this is indeed needed.)
  - Configure the scopes and include `https://www.googleapis.com/auth/calendar`.
  - Add the account you want to use as a test user.

### Starting the Vite Dev Server

After preparing the `secrets.ts` file, you can run:

```bash
yarn install
yarn run dev
```

:warning: **Do not build this project and host it somewhere publicly, since it would expose all keys from `secrets.ts`!**

## Ideas for Next Features

- [ ] Add a status/error React context, surfacing errors as message strips or similar.
- [ ] Add speaker separation/partitioning and trim the audio to the speaker who initiated the conversation
- [ ] Add buttons below messages, like play as speech, or edit for user messages
- [ ] Add a "Clear" button to the chat
- [ ] Implement automatically naming chats via LLM
- [ ] Structured replies that force the LLM to consider some things with each reply
  - [ ] Always collect "things to remember"
- [ ] Fix inconsistencies that developed over time:
  - [ ] Browser SpeechRecognition should be used when "Use Whisper transcription" is disabled
  - [x] Trigger word needs to be picked from Porcupine built-in keywords
- [ ] Move gear icon into sidebar
- [ ] Optional integrate Google Calendar API
- [ ] Add Spotify integration?

## Done

- [x] Temporarily open the microphone for conversation after the assistant finished speaking
- [x] Add a "Stop" button while the response is streaming in
- [x] More visual feedback during phases of assembling the user message
- [x] While responding, the trigger phrase should interrupt the assistant from speaking
- [x] Prevent code blocks from being part of text-to-speech
- [x] Allow to preserve chats
- [x] Reset Porcupine when browser tab is (re-)activated
- [x] Implement renaming chats
