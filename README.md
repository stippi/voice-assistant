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

export const OpenWeatherMapApiKey = "<Your openweathermap.org API key>";
```

This file is ignored by git.

In order to use the GPT-4 model, your `platform.openai.com` account must have billing information and one successful payment.
You can now manually initiate a payment via "Buy credits" on the [billing overview page](https://platform.openai.com/account/billing/overview).

The API key for `openweathermap.org` can be for the free tier.

Then run:

```bash
npm install
npm run dev
```
