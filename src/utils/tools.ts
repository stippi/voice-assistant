// @ts-expect-error - The import works, no idea why the IDE complains
import {ChatCompletionMessage, ChatCompletionTool} from "openai/resources";
import {OpenWeatherMapApiKey, NewsApiOrgKey} from "../secrets";
import {create, all} from "mathjs";
import {Timer} from "../model/timer";
import {addIsoDurationToDate} from "./timeFormat";
import {AppContextType} from "../contexts/AppContext.tsx";

const math = create(all, {})

const newsApiLanguageParam = {
  type: "string",
  enum: [ "ar", "de", "en", "es", "fr", "he", "it", "nl", "no", "pt", "ru", "sv", "ud", "zh" ]
};

const newsApiCountryParam = {
  type: "string",
  enum: [
    "ae", "ar", "at", "au", "be", "bg", "br", "ca", "ch", "cn", "co", "cu", "cz", "de", "eg",
    "fr", "gb", "gr", "hk", "hu", "id", "ie", "il", "in", "it", "jp", "kr", "lt", "lv", "ma",
    "mx", "my", "ng", "nl", "no", "nz", "ph", "pl", "pt", "ro", "rs", "ru", "sa", "se", "sg",
    "si", "sk", "th", "tr", "tw", "ua", "us", "ve", "za"
  ]
}

const newsApiCategoryParam = {
  type: "string",
  enum: [
    "business",
    "entertainment",
    "general",
    "health",
    "science",
    "sports",
    "technology"
  ]
};

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
      name: "get_top_headlines",
      description: "Get the latest news (top headlines) according to parameters",
      parameters: {
        type: "object",
        properties: {
          language: newsApiLanguageParam,
          country: newsApiCountryParam,
          category: newsApiCategoryParam,
          query: { type: "string", description: "Keywords or phrases to search for" },
          sortBy: { type: "string", enum: [ "relevancy", "popularity", "publishedAt" ] }
        },
        required: ["language", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_news",
      description: "Get the latest news (everything) according to parameters",
      parameters: {
        type: "object",
        properties: {
          language: newsApiLanguageParam,
          country: newsApiCountryParam,
          query: { type: "string", description: "Keywords or phrases to search for" },
          sources: { type: "string", description: "A comma-seperated list of news sources to retrieve news from" },
          searchIn: { type: "string", enum: [ "title", "description", "content" ] },
          from: { type: "string", description: "The earliest date to retrieve news from in ISO 8601 format" },
          to: { type: "string", description: "The latest date to retrieve news from in ISO 8601 format" },
          sortBy: { type: "string", enum: [ "relevancy", "popularity", "publishedAt" ] }
        },
        required: ["language"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_alarm",
      description: "Add an alarm to the active timers. Displayed as an alarm for the given time.",
      parameters: {
        type: "object",
        properties: {
          time: {
            type: "string",
            description: "The exact time when the timer should go off, in the format 'YYYY-MM-DD HH:MM:SS'."
          },
          title: {
            type: "string",
            description: "Optional title of the timer."
          }
        },
        required: ["time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_countdown",
      description: "Add a countdown timer to the active timers. Displayed as counting down to zero.",
      parameters: {
        type: "object",
        properties: {
          duration: {
            type: "string",
            description: "A duration in ISO 8601 format."
          },
          title: {
            type: "string",
            description: "Optional title of the timer."
          }
        },
        required: ["duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_timer",
      description: "Cancel one of the active timers",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string"
          }
        },
        required: ["id"]
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
  },
  {
    type: "function",
    function: {
      name: "show_image",
      description: "Display an SVG image in the chat",
      parameters: {
        type: "object",
        properties: {
          image: {
            type: "string",
            description: "The SVG image's XML code as a string"
          }
        },
        required: ["image"]
      }
    }
  }
];

export async function callFunction(functionCall: ChatCompletionMessage.FunctionCall, appContext: AppContextType): Promise<object> {
  try {
    const args = JSON.parse(functionCall.arguments || "{}");
    switch (functionCall.name) {
      case 'get_current_weather':
        return await getCurrentWeather(args.latitude, args.longitude);
      case 'get_weather_forecast':
        return await getWeatherForecast(args.latitude, args.longitude);
      case 'get_top_headlines':
        return await getTopNews(args.language, args.country, args.category, args.query, args.sortBy);
      case 'get_news':
         return await getNews(args.language, args.country, args.query, args.sources, args.searchIn, args.from, args.to, args.sortBy);
      case 'add_alarm':
        return await addTimer("alarm", args.time, args.title || "", appContext);
      case 'add_countdown':
        return await addTimer("countdown", addIsoDurationToDate(new Date(), args.duration).toString(), args.title || "", appContext);
      case 'remove_timer':
        return await removeTimer(args.id, appContext);
      case 'evaluate_expression':
        return await evaluateExpression(args.expression);
      case 'memorize':
        return await memorize(args.category, args.information);
      case 'delete_memory_entry':
        return await deleteInformation(args.category, args.information);
      case 'show_image':
        return { result: "image displayed" };
      
      default:
        return { error: `unknown function '${functionCall.name}'`};
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
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

async function getTopNews(language: string, country: string, category: string, query: string, sortBy: string) {
  const queryParams = new URLSearchParams();
  queryParams.append("apiKey", NewsApiOrgKey);
  queryParams.append("pageSize", "10");
  if (language) {
    queryParams.append("language", language);
  }
  if (country) {
    queryParams.append("country", country);
  }
  if (category) {
    queryParams.append("category", category);
  }
  if (query) {
    queryParams.append("q", query);
  }
  if (sortBy) {
    queryParams.append("sortBy", sortBy);
  }
  const url = `https://newsapi.org/v2/top-headlines?${queryParams.toString()}`;
  console.log(`Fetching news from ${url}`);
  const response = await fetch(url);
  return await response.json();
}

async function getNews(language: string, country: string, query: string, sources: string, searchIn: string, from: string, to: string, sortBy: string) {
  const queryParams = new URLSearchParams();
  queryParams.append("apiKey", NewsApiOrgKey);
  queryParams.append("pageSize", "10");
  if (language) {
    queryParams.append("language", language);
  }
  if (country) {
    queryParams.append("country", country);
  }
  if (query) {
    queryParams.append("q", query);
  }
  if (sources) {
    queryParams.append("sources", sources);
  }
  if (searchIn) {
    queryParams.append("searchIn", searchIn);
  }
  if (from) {
    queryParams.append("from", from);
  }
  if (to) {
    queryParams.append("to", to);
  }
  if (sortBy) {
    queryParams.append("sortBy", sortBy);
  }
  const url = `https://newsapi.org/v2/everything?${queryParams.toString()}`;
  console.log(`Fetching news (everything) from ${url}`);
  const response = await fetch(url);
  return await response.json();
}

async function addTimer(type: "countdown" | "alarm", time: string, title: string, appContext: AppContextType) {
  console.log(`Adding timer: ${type} at ${time} with title '${title}'`);
  const timer: Timer = {
    id: Math.random().toString(36).substring(7),
    type,
    time,
    title
  }
  appContext.setTimers([...appContext.timers, timer]);
  return { result: `timer created with ID ${timer.id}` };
}

async function removeTimer(id: string, appContext: AppContextType) {
  console.log(`Removing timer: ${id}`);
  appContext.setTimers(appContext.timers.filter(timer => timer.id !== id))
  return { result: "timer removed" };
}

async function evaluateExpression(expression: string) {
  try {
    return { result: math.evaluate(expression) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" }
  }
}

function loadMemory(): Record<string, string[]> {
  const memoryString = window.localStorage.getItem('memory');
  if (memoryString) {
    return JSON.parse(memoryString);
  }
  return {};
}

function saveMemory(memory: Record<string, string[]>) {
  window.localStorage.setItem('memory', JSON.stringify(memory));
}

async function memorize(category: string, information: string) {
  console.log(`Memorizing: # ${category}\n${information.split('\n').map((line: string) => `- ${line}`).join('\n')}`);
  
  const memory = loadMemory();
  
  if (!Array.isArray(memory[category])) {
    memory[category] = [];
  }
  memory[category].push(...information.split('\n'));

  saveMemory(memory);
  return { result: "information stored" };
}

async function deleteInformation(category: string, information: string) {
  console.log(`Erasing memory: # ${category}: "${information}"`);
  
  const memory = loadMemory();
  
  for (let i = 0; i < memory[category].length; i++) {
    if (memory[category][i].startsWith(information)) {
      memory[category].splice(i, 1);
      saveMemory(memory);
      return { result: "information deleted" };
    }
  }

  return { result: "information not found in category" };
}