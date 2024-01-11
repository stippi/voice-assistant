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
```

:bulb: **This file is ignored by git.**

In order to use the GPT-4 model, your `platform.openai.com` account must have billing information and one successful payment.
You can now manually initiate a payment via "Buy credits" on the [billing overview page](https://platform.openai.com/account/billing/overview).

The API key for `openweathermap.org` can be for the free tier.

Similarly, the API key for `picovoice.ai` is free to obtain for personal use.
It just comes with a rate limit. 

Then run:

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
- [ ] Implement renaming chats
- [ ] Implement automatically naming chats via LLM
- [ ] Structured replies that force the LLM to consider some things with each reply
  - [ ] Always collect "things to remember"
- [ ] Fix inconsistencies that developed over time:
  - [ ] Browser SpeechRecognition should be used when "Use Whisper transcription" is disabled
  - [x] Trigger word needs to be picked from Porcupine built-in keywords
- [ ] Move gear icon into sidebar
- [ ] Switch to another component library?
- [ ] Add Spotify integration?

## Done

- [x] Temporarily open the microphone for conversation after the assistant finished speaking
- [x] Add a "Stop" button while the response is streaming in
- [x] More visual feedback during phases of assembling the user message
- [x] While responding, the trigger phrase should interrupt the assistant from speaking
- [x] Prevent code blocks from being part of text-to-speech
- [x] Allow to preserve chats
- [x] Reset Porcupine when browser tab is (re-)activated
