import {ChatCompletionMessage, ChatCompletionTool} from "openai/resources";
import {OpenWeatherMapApiKey} from "../secrets.ts";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" }
        },
        required: ["latitude", "longitude"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_weather_forecast",
      description: "Get the weather forecast for 5 days with data every 3 hours in a given location",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" }
        },
        required: ["latitude", "longitude"]
      }
    }
  }
];

export async function callFunction(functionCall: ChatCompletionMessage.FunctionCall): Promise<any> {
  const args = JSON.parse(functionCall.arguments || "{}");
  switch (functionCall.name) {
    case 'get_current_weather':
      return await getCurrentWeather(args.latitude, args.longitude);
    case 'get_weather_forecast':
      return await getWeatherForecast(args.latitude, args.longitude);
    
    default:
      throw new Error(`Unknown function ${functionCall.name}`);
  }
}

async function getCurrentWeather(lat: number, lon: number) {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`);
  return await response.json();
}

async function getWeatherForecast(lat: number, lon: number) {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`);
  return await response.json();
}
