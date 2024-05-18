# Voice Assistant

Start a spoken ChatGPT conversation by activation word in your browser.

This project was bootstrapped using `npm create vite@latest ./ -- --template react-ts`.

## About

https://github.com/stippi/voice-assistant/assets/67784/bc1989e9-6595-4996-b1c3-8a136cdfc882

The rough idea for this project is to have a voice-activated assistant similar to Amazon Alexa or Siri, but backed by a Large Language Model.
It is currently implemented as a website running purely in your browser.
It uses OpenAI's GPT-4 Turbo model configured with several tools (a.k.a. "functions") that allow it to integrate with a range of APIs.
To use these APIs, secrets must be provided, see below.
The most "sophisticated" integrations are for Google and Spotify.

Generally, you can just ask the Assistant what it can do for you. ;-)

## Running Locally

Create a file named `config.ts` in the `src` directory.
You can copy the file [`src/config.ts.example`](src/config.ts.example) and adjust it to your needs.

```typescript
// The following configuration is required:

// By configuring the endpoints below, you can use a server with OpenAI compatible REST API:
export const completionsApiKey = "<The API Key used for /completions endpoint>";

//export const completionsApiUrl = "http://localhost:5173/mistral/"; // Proxy for https://api.mistral.ai/v1/ due to CORS issues, see vite.config.ts
//export const completionsApiUrl = "http://localhost:8080/v1"; // LocalAI server, which needs to be started with --cors
export const completionsApiUrl = "https://api.openai.com/v1";

export const speechApiKey = "<The API Key used for tts and stt endpoints>";
export const speechApiUrl = "https://api.openai.com/v1";

//export const modelName = "mistral-large-latest";
export const modelName = "gpt-4-turbo-preview";
export const useTools = true;
export const useStreaming = true;

// All the following API keys are optional, and are only required if you want to use the corresponding features.

// Your picovoice.ai Access Key (wake word detection):
export const PicoVoiceAccessKey = "";

// Your openweathermap.org API Key (used for weather tools):
export const OpenWeatherMapApiKey = "";

// Your newsapi.org API key (used for some news tools):
export const NewsApiOrgKey = "";

export const GoogleApiKey = "<Your googleapis.com API key>";
export const GoogleClientId = "XXX.apps.googleusercontent.com";
export const GoogleClientSecret = "<Your OAuth2 Client Secret/Key>";
export const GoogleCustomSearchEngineId = "<ID of your custom google search engine configured for global search>";
// export const GoogleProjectId = "<Your Google Cloud Console project ID>"; // Needed for Google Vertex AI API (Gemini Pro)

export const SpotifyClientId = "<Your Spotify Client ID>";

export const MicrosoftClientId = "<Your Azure App Client ID>";
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

To get an API key for the Google APIs, you need to create a "project" in the [Google developer console](https://console.cloud.google.com) and enable the following APIs:

- Maps JavaScript API
- Places API (New)
- Routes API
- Directions API
- Custom Search API (you need to create a custom search engine)
- Calendar API (if you plan to activate the Google Integration, see below)
- People API (if you plan to activate the Google Integration, see below)
- Photos Library API (if you plan to activate the Google Integration, see below)

### Google Integration

For the optional Google Calendar and Contacts integration (enabled in the Assistant Settings via the switch `Google Integration`), you need to provide a `GoogleClientId` in addition to the `GoogleApiKey`.
The reason is that you need to log in with your Google account, and this requires setting up an OAuth2 Client of type `Web Application` on the Google cloud console for your project.

A number of things need to be configured in your cloud project:

- Create an `OAuth 2.0-Client-ID`:
  - Add both `http://localhost:5173` and `http://localhost` to the authorized Javascript origins.
  - Add `http://localhost:5173/google-callback` to the authorized redirection URIs.
- *Edit* the `OAuth Consent Screen`:
  - Set the start page to `http://localhost:5173` (not sure if this is indeed needed.)
  - Configure the scopes and include:
    - `https://www.googleapis.com/auth/calendar`
    - `https://www.googleapis.com/auth/contacts.readonly`
    - `https://www.googleapis.com/auth/photoslibrary.readonly`<br/>
    The scopes are available only if you also enabled the APIs in your cloud project.
  - Add the account you want to use as a test user.

### Spotify Integration

For the optional Spotify integration (enabled in the Assistant Settings via the switch `Spotify Integration`), you need to provide a `SpotifyClientId`.
To get a client ID, you need to register an application on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).

As website, specify `http://localhost:5173`.
As redirect URL, specify `http://localhost:5173/spotify-callback`.

When enabling the Spotify integration, you will be redirected to a Spotify login page where you also need to give Voice Assistant (or however you named your app in the Spotify developer dashboard) the requested permissions.
In addition, the embedded playback streaming capabilities work only for Spotify Premium users, since the Web Playback SDK requires a Premium account.

### Microsoft Integration

For the optional Microsoft integration (enabled in the Assistant Settings via the switch `Microsoft Integration`), you need to provide a `MicrosoftClientId`.
To get a client ID, you need to register an application on the [Azure Portal](https://portal.azure.com/).
It must have the following settings:
- The application type must be `Single Page Application`.
- The redirect URL must be `http://localhost:5173/microsoft-callback`.
- The tenant type must be multi-tenant.
- The scopes must include `User.Read` and `Calendars.ReadWrite`.

### OpenAI compatible servers

There are a bunch of services that provide OpenAI compatible REST endpoints.
For example, there is [LocalAI](https://github.com/mudler/LocalAI), a project that allows you to run various LLMs locally.
But there are others like LM Studio, vLLM and so on.

These projects provides an API that can be used (mostly) as a drop-in replacement for OpenAI's.

For this reason, the `config.ts` file exports the `completionsApiUrl` and related settings like the API key and model name.
This allows to configure another OpenAI compatible server.
I've tested Mistral, Groq and others.
However, the support for tools is currently very limited compared to what GPT-4-Turbo can do.
Often, you can't use streaming and tools concurrently.
And the LLMs are often overwelmed and just don't reliably understand when to use tools and how to invoke them.
With OpenAI's GPT-4-Turbo, we can use 30 and more with close to perfect reliability.

### Starting the Vite Dev Server

After preparing the `config.ts` file, you can run:

```bash
yarn install
yarn run dev
```

:warning: **Do not build this project and host it somewhere publicly, since it would expose all keys from `config.ts`!**

## Ideas for Next Features

- [ ] Add an "idle" mode:
  - [ ] Dashboard fills the screen, conversation is minimized
  - [ ] Activation starts temporary chat at first, which may could become persisted chat based on some condition.
- [ ] Optimize context window size for the LLM.
- [ ] Integrate more Microsoft Graph APIs.
- [ ] Add a temporary chat mode, where the chat is auto-cleared after some time of inactivity.
- [ ] Add a status/error React context, surfacing errors as message strips or similar.
- [ ] Create a persistent Spotify playlist for the Voice-Assistant with dynamic content.
  This is necessary to allow jumping to a specific song in the playlist.
- [ ] Indicate in tool results whether to send the result to the LLM to receive a response.
  Some tool calls like starting music playback should skip the reply, as the result is obvious to the user.
- [ ] Add speaker separation/partitioning and trim the audio to the speaker who initiated the conversation
- [ ] Add buttons below messages, like play as speech, or edit for user messages
  - [x] Delete a single message button
  - [ ] Edit a single message button
  - [ ] Play a single message button
  - [ ] Regenerate the LLM response
- [ ] Structured replies that force the LLM to consider some things with each reply
  - [ ] Always collect "things to remember"
  - [ ] Automatic naming chats via LLM
  - [ ] Get a summary of chat up to that point, use to cut off messages from the beginning
- [ ] Fix inconsistencies that developed over time:
  - [ ] Browser SpeechRecognition should be used when "Use Whisper transcription" is disabled
  - [x] Trigger word needs to be picked from Porcupine built-in keywords
- [ ] Strip URLs from audible replies
