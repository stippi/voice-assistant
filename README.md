# Voice Assistant

Start a spoken ChatGPT conversation by activation word in your browser.

This project was bootstrapped using `npm create vite@latest ./ -- --template react-ts`.

## About

The rough idea for this project is to have a voice-activated assistant similar to Amazon Alexa or Siri, but backed by a Large Language Model.
It is currently implemented as a website running purely in your browser.
It uses OpenAI's GPT-4 Turbo model configured with several tools (a.k.a. "functions") that allow it to integrate with a range of APIs.
To use these APIs, secrets must be provided, see below.
The most "sophisticated" integrations are for Google and Spotify.

Generally, you can just ask the Assistant what it can do for you. ;-)

Eventually, it would be nice to host the website in a native application that is less restricted than a Browser.

## Running Locally

Create a file named `secrets.ts` in the `src` directory with the following contents:

```typescript
// Required:
export const OpenAiConfig = {
  apiKey: "<Your platform.openai.com API key>",
  dangerouslyAllowBrowser: true
};
// When running LocalAI, use the following configuration:
// export const OpenAiConfig = {
//   apiKey: '<ignored>',
//   dangerouslyAllowBrowser: true,
//   baseURL: 'http://localhost:8080/v1'
// };

// Theoretically optional. Must be exported, but can be empty.
export const PicoVoiceAccessKey = "<Your picovoice.ai Access key>";

export const OpenWeatherMapApiKey = "<Your openweathermap.org API key>";

export const NewsApiOrgKey = "<Your newsapi.org API key>";

export const GoogleApiKey = "<Your googleapis.com API key>";
export const GoogleClientId = "XXX.apps.googleusercontent.com";
export const GoogleClientSecret = "<Your OAuth2 Client Secret/Key>";
export const GoogleCustomSearchEngineId = "<ID of your custom google search engine configured for global search>";

export const SpotifyClientId = "<Your Spotify Client ID>";
```

:bulb: **This file is ignored by git.**

In order to use the GPT-4 model, your [platform.openai.com](https://platform.openai.com/) account must have billing information and one successful payment.
If your account was never charged, yet, you can manually initiate a payment via "Buy credits" on the [billing overview page](https://platform.openai.com/account/billing/overview).
This will "unlock" the GPT-4 models.

The API key for [openweathermap.org](https://openweathermap.org/) can be for the free tier.

Similarly, the API key for [picovoice.ai](https://picovoice.ai) is free to obtain for personal use.
It just comes with a rate limit.
Not providing the PicoVoiceAccessKey will most likely break wake-word detection.
In theory, the Browser Speech Recognition API is used as a fallback, but it hasn't been tested in a while.

To get an API key for the Google APIs, you need create a "project" in the [Google developer console](https://console.cloud.google.com) and enable the following APIs:

- Maps JavaScript API
- Places API (New)
- Routes API
- Directions API
- Custom Search API (you need to create a custom search engine)
- Calendar API (if you plan to activate the Google Integration, see below)
- People API (if you plan to activate the Google Integration, see below)

### Google Integration

For the optional Google Calendar and Contacts integration (enabled in the Assistant Settings via the switch `Google Integration`), you need to provide a `GoogleClientId` in addition to the `GoogleApiKey`.
The reason is that you need to log in with your Google account, and this requires setting up an OAuth2 Client of type `Web Application` on the Google cloud console for your project.

A number of things need to be configured in your cloud project:

- Create an `OAuth 2.0-Client-ID`:
  - Add both `http://localhost:5173` and `http://localhost` to the authorized Javascript origins.
  - Add `http://localhost:5173/google-callback` to the authorized redirection URIs.
- *Edit* the `OAuth Consent Screen`:
  - Set the start page to `http://localhost:5173` (not sure if this is indeed needed.)
  - Configure the scopes and include `https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/contacts.readonly`.
    The scopes are available only if you also enabled the APIs in your cloud project.
  - Add the account you want to use as a test user.

### Spotify Integration

For the optional Spotify integration (enabled in the Assistant Settings via the switch `Spotify Integration`), you need to provide a `SpotifyClientId`.
To get a client ID, you need to register an application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).

As website, specify `http://localhost:5173`.
As redirect URL, also specify `http://localhost:5173/spotify-callback`.

When enabling the Spotify integration, you will be redirected to a Spotify login page where you also need to give Voice Assistant (or however you named your app in the Spotify developer dashboard) the requested permissions.
In addition, the embedded playback streaming capabilities work only for Spotify Premium users, since the Web Playback SDK requires a Premium account.

### LocalAI

[LocalAI](https://github.com/mudler/LocalAI) is a project that allows you to run various LLMs locally.
It provides a REST API that can be used (mostly) as a drop-in replacement for OpenAI's API.
When you configure a `baseURL` in `OpenAiConfig`, the Assistant will use this URL to send requests to the LocalAI server.
It will also automatically provide a model name of `mistral`.
This doesn't have to be actual LLM you use, but it must be the name under which it is exposed.
See the [LocalAI documentation](https://localai.io/docs/getting-started/manual/) for more information.

:construction: At the moment, function calls (which provide a lot of the integrations of this Voice Assistant), are not yet provided in a compatible way by LocalAI.

### Starting the Vite Dev Server

After preparing the `secrets.ts` file, you can run:

```bash
yarn install
yarn run dev
```

:warning: **Do not build this project and host it somewhere publicly, since it would expose all keys from `secrets.ts`!**

## Ideas for Next Features

- [ ] Add a status/error React context, surfacing errors as message strips or similar.
- [ ] Create a persistent Spotify playlist for the Voice-Assistant with dynamic content.
  This is necessary to allow jumping to a specific song in the playlist.
- [ ] Indicate in tool results whether to send the result to the LLM to receive a response.
  Some tool calls like starting music playback should skip the reply, as the result is obvious to the user.
- [ ] Make providing any keys besides the OpenAI key truly optional, also removing corresponding LLM function declarations
- [ ] Allow choosing the model (downgrading to GPT-3.5 and potentially improving latency)
- [ ] Add speaker separation/partitioning and trim the audio to the speaker who initiated the conversation
- [ ] Add buttons below messages, like play as speech, or edit for user messages
  - [x] Delete a single message button
  - [ ] Edit a single message button
  - [ ] Play a single message button
  - [ ] Regenerate the LLM response
- [ ] Add a "Clear" button to the chat
- [ ] Implement automatically naming chats via LLM
- [ ] Structured replies that force the LLM to consider some things with each reply
  - [ ] Always collect "things to remember"
- [ ] Fix inconsistencies that developed over time:
  - [ ] Browser SpeechRecognition should be used when "Use Whisper transcription" is disabled
  - [x] Trigger word needs to be picked from Porcupine built-in keywords
- [ ] Strip URLs from audible replies

## Done

- [x] Switch to redirect login flow for signing into Google, like with Spotify.
  This allows to continuously fetch a new access token with the refresh token.
- [x] Optional integrate Google Calendar API
- [X] Add Spotify integration (in progress)
  - [x] Spotify auth flow
  - [x] Spotify playback SDK loading
  - [X] Spotify search
  - [X] Spotify playback
- [x] Temporarily open the microphone for conversation after the assistant finished speaking
- [x] Add a "Stop" button while the response is streaming in
- [x] More visual feedback during phases of assembling the user message
- [x] While responding, the trigger phrase should interrupt the assistant from speaking
- [x] Prevent code blocks from being part of text-to-speech
- [x] Allow to preserve chats
- [x] Reset Porcupine when browser tab is (re-)activated
- [x] Implement renaming chats
- [x] Move gear icon into sidebar
