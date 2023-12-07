# Voice Assistant

Start a spoken ChatGPT conversation by activation word

This project was bootstrapped using `npm create vite@latest ./ -- --template react-ts`.

## Running Locally

Create a file named `secrets.ts` in the `src` directory with the following contents:

```typescript
export const OpenAiConfig = {
  apiKey: '<Your platform.openai.com API key>',
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
npm install
npm run dev
```

:warning: **Do not build this project and host it somewhere publicly, since it would expose all keys from `secrets.ts`!.**

## Ideas for Next Features

- [x] Temporarily open the microphone for conversation after the assistant finished speaking
- [ ] Add speaker separation/partitioning and trim the audio to the speaker who initiated the conversation
- [ ] Add a "Stop" button while the response is streaming in
- [ ] More visual feedback during phases of assembling the user message
- [ ] While responding, the trigger phrase should interrupt the assistant from speaking
- [ ] Add buttons below messages, like play as speech, or edit for user messages
- [ ] Display errors as strips, for example when audio playback is blocked
- [ ] Prevent code blocks from being part of text-to-speech
- [ ] Add a "Clear" button to the chat
- [ ] Allow to preserve chats
