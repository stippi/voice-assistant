import {ChatCompletionMessage, ChatCompletionTool} from "openai/resources";
import {OpenWeatherMapApiKey} from "../secrets.ts";
import { create, all } from 'mathjs'

const math = create(all, {})

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
  },
  {
    type: "function",
    function: {
      name: "evaluate_expression",
      description: "Evaluate a mathematical expression in the mathjs syntax",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string" }
        },
        required: ["expression"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "memorize",
      description: "Store information to have it permanently available in future conversations",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              'About the User',
              'User Preferences',
              'User Interests',
              'Shared Knowledge',
              'Agreed Facts',
              'Other'
            ]
          },
          information: { type: "string" }
        },
        required: ["category", "information"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_memory_entry",
      description: "Erase the piece of information from the memory category",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              'About the User',
              'User Preferences',
              'User Interests',
              'Shared Knowledge',
              'Agreed Facts',
              'Other'
            ]
          },
          information: { type: "string" }
        },
        required: ["category", "information"]
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
    case 'evaluate_expression':
      return await evaluateExpression(args.expression);
    case 'memorize':
      return await memorize(args.category, args.information);
    case 'delete_memory_entry':
      return await deleteInformation(args.category, args.information);
    
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

async function evaluateExpression(expression: string) {
  try {
    return { result: math.evaluate(expression) }
  } catch (error) {
    return { error: error.message }
  }
}

function loadMemory() {
  const memoryString = window.localStorage.getItem('memory');
  if (memoryString) {
    return JSON.parse(memoryString);
  }
  return {};
}

function saveMemory(memory: any) {
  window.localStorage.setItem('memory', JSON.stringify(memory));
  return { result: "information stored" };
}

async function memorize(category: string, information: string) {
  console.log(`Memorizing: # ${category}\n${information.split('\n').map((line: string) => `- ${line}`).join('\n')}`);
  
  const memory = loadMemory();
  
  if (!Array.isArray(memory[category])) {
    memory[category] = [];
  }
  memory[category].push(...information.split('\n'));

  return saveMemory(memory);
}

async function deleteInformation(category: string, information: string) {
  console.log(`Erasing memory: # ${category}: "${information}"`);
  
  const memory = loadMemory();
  
  for (let i = 0; i < memory[category].length; i++) {
    if (memory[category][i].startsWith(information)) {
      memory[category].splice(i, 1);
      return saveMemory(memory);
    }
  }

  return { result: "information not found in category" };
}