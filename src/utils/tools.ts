// @ts-expect-error - The import works, no idea why the IDE complains
import {ChatCompletionMessage, ChatCompletionTool} from "openai/resources";
import {OpenWeatherMapApiKey, NewsApiOrgKey, GoogleApiKey, GoogleCustomSearchEngineId} from "../secrets";
import {create, all} from "mathjs";
import {Timer} from "../model/timer";
import {addIsoDurationToDate, formatTimestamp} from "./timeFormat";
import {AppContextType, Spotify} from "../contexts/AppContext.tsx";
import OpenAI from "openai";
import ChatCompletionMessageToolCall = OpenAI.ChatCompletionMessageToolCall;

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
      name: "google_custom_search",
      description: "Use only to query for information you don't already know",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          maxResults: { type: "number" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_places_info",
      description: "Get information about nearby places using the Google Places API",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          radius: { type: "number", description: "The radius in meters around the given location" },
          query: { type: "string", description: "A text query like the name of a nearby place" },
          fields: { type: "array", items: { type: "string" }, description: "A list of fields to retrieve for each place. Available fields are 'formattedAddress', 'regularOpeningHours', 'currentOpeningHours', 'types', 'rating' and 'websiteUri'" },
          maxResults: { type: "number" }
        },
        required: ["latitude", "longitude", "query", "fields"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_map",
      description: "Display a map centered on the given location",
      parameters: {
        type: "object",
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          zoom: { type: "number" }
        },
        required: ["latitude", "longitude"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_directions",
      description: "Display a map with directions from the given origin to the given destination",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Latitude and longitude in the format 'latitude,longitude', address or name of a place" },
          destination: { type: "string", description: "Name of a place, address, or latitude and longitude in the format 'latitude,longitude'" },
          travelMode: { type: "string", enum: [ "DRIVING", "BICYCLING", "TRANSIT", "WALKING" ] },
          arrivalTime: { type: "string", description: "Desired arrival time in ISO 8601 format" },
          departureTime: { type: "string", description: "Desired departure time in ISO 8601 format" },
        },
        required: ["origin", "destination", "travelMode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_transit_directions",
      description: "Display a map with public transport directions from the given origin to the given destination",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Latitude and longitude in the format 'latitude,longitude', address or name of a place" },
          destination: { type: "string", description: "Name of a place, or latitude and longitude in the format 'latitude,longitude'" },
          arrivalTime: { type: "string", description: "Desired arrival time in ISO 8601 format" },
          departureTime: { type: "string", description: "Desired departure time in ISO 8601 format" },
          modes: { type: "array", items: { type: "string" }, description: "Preferred modes of transport. Available are 'BUS', 'RAIL', 'SUBWAY', 'TRAIN', 'TRAM'" },
          routingPreference: { type: "string", enum: ["FEWER_TRANSFERS", "LESS_WALKING"] },
        },
        required: ["origin", "destination"]
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
      name: "delete_timer",
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
      name: "add_google_calendar_event",
      description: "Add an event to a user's calendar.",
      parameters: {
        type: "object",
        properties: {
          calendarId: { type: "string", description: "The ID of the calendar (defaults to 'primary')" },
          summary: { type: "string", description: "Summary of the event" },
          description: { type: "string", description: "Optional description of the event" },
          startTime: { type: "string", description: "Start time in the format 'YYYY-MM-DD HH:MM:SS'" },
          timeZone:  { type: "string", description: "The time zone in which the time is specified. (Formatted as an IANA Time Zone Database name, e.g. 'Europe/Zurich'.)" },
          duration: { type: "string", description: "Duration in minutes" },
          recurrence: { type: "array", items: { type: "string" }, description: "Optional recurrence rules in RRULE format" },
          reminders: { type: "array", items: {
              type: "object",
              properties: { minutes: { type: "integer" }, method: { type: "string", enum: ["popup", "email"] } }
            },
            description: "Optional reminders in minutes before the event" }
        },
        required: ["summary", "startTime", "timeZone", "duration"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_google_calendar_event",
      description: "Delete an event from the user's calendar.",
      parameters: {
        type: "object",
        properties: {
          calendarId: { type: "string", description: "The ID of the calendar (defaults to 'primary')" },
          eventId: { type: "string", description: "The ID of the event to delete" },
        },
        required: ["eventId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_google_calendar_events",
      description: "List or query events from the user's calendar.",
      parameters: {
        type: "object",
        properties: {
          calendarId: { type: "string", description: "The ID of the calendar (defaults to 'primary')" },
          query: { type: "string", description: "Text search over events" },
          timeMin: { type: "string", description: "Start time of the search (inclusive), in ISO format" },
          timeMax: { type: "string", description: "End time of the search (exclusive), in ISO format" },
          maxResults: { type: "integer", description: "Maximum number of results to return" },
          singleEvents: { type: "boolean", description: "Whether to return single events from recurring events" },
          orderBy: { type: "string", enum: ["startTime", "updated"], description: "Order of the results" },
          showDeleted: { type: "boolean", description: "Whether to include deleted events in the results" }
        },
        required: ["singleEvents"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_google_contacts",
      description: "List all contacts from the the user.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text search over contacts" }
        },
        required: []
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
      name: "add_memory_entry",
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
  },
  {
    type: "function",
    function: {
      name: "play_on_spotify",
      description: "Start playing tracks, an album, artist or a playlist on Spotify. " +
        "Calling this function replaces the current playlist!",
      parameters: {
        type: "object",
        properties: {
          trackIds: { type: "array", items: { type: "string" }, description: "Optional. An array of track IDs" },
          contextUri: { type: "string", description: "Optional. The Spotify URI of an album, artist, or playlist." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_artists_and_play_top_songs_on_spotify",
      description: "Searches for 'queries' on Spotify and plays top songs of the found artist(s). " +
        "Calling this function replaces the current playlist! " +
        "Pass multiple artists to one tool invocation to play a mix of top songs from different artists.",
      parameters: {
        type: "object",
        properties: {
          queries: { type: "array", items: { type: "string" }, description: "One or more queries to find artists by." },
        },
        required: ["queries"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_on_spotify",
      description: "Find tracks, artists, albums or playlists on Spotify",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          types: {
            type: "array",
            items: { type: "string" },
            description: "Types to search across. Valid types are: 'track', 'artist', 'album', 'playlist', 'show', and 'episode'."
          },
          limit: { type: "integer", description: "The maximum number of items to return" }
        },
        required: ["query", "types"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "resume_spotify_playback",
      description: "Resume streaming playback on Spotify Player.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pause_spotify_playback",
      description: "Pause streaming playback on Spotify Player",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "spotify_skip_next",
      description: "Skip to the next song on the Spotify Player",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "spotify_skip_previous",
      description: "Skip to the previous song on the Spotify Player",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

export function showToolCallInChat(toolCall:  ChatCompletionMessageToolCall): boolean {
  return ["show_image", "show_map", "show_directions", "show_transit_directions"].includes(toolCall.function.name);
}

export async function callFunction(functionCall: ChatCompletionMessage.FunctionCall, appContext: AppContextType): Promise<object> {
  try {
    const args = JSON.parse(functionCall.arguments || "{}");
    console.log("calling function:", functionCall.name, args);
    switch (functionCall.name) {
      case 'get_current_weather':
        return await getCurrentWeather(args.latitude, args.longitude);
      case 'get_weather_forecast':
        return await getWeatherForecast(args.latitude, args.longitude);
      case 'get_top_headlines':
        return await getTopNews(args.language, args.country, args.category, args.query, args.sortBy);
      case 'get_news':
         return await getNews(args.language, args.country, args.query, args.sources, args.searchIn, args.from, args.to, args.sortBy);
      case 'google_custom_search':
        return await googleCustomSearch(args.query, args.maxResults)
      case 'get_places_info':
        return await getPlacesInfo(args.query, args.fields, args.latitude, args.longitude, args.radius, args.maxResults);
      case 'add_alarm':
        return await addTimer("alarm", args.time, args.title || "", appContext);
      case 'add_countdown':
        return await addTimer("countdown", addIsoDurationToDate(new Date(), args.duration).toString(), args.title || "", appContext);
      case 'delete_timer':
        return await removeTimer(args.id, appContext);
      case 'add_google_calendar_event':
        return await createCalendarEvent(args.calendarId, args.summary, args.description, args.startTime, args.timeZone, args.duration, args.recurrence, args.reminders);
      case 'delete_google_calendar_event':
        return await deleteCalendarEvent(args.calendarId, args.eventId);
      case 'list_google_calendar_events':
        return await listCalendarEvents(args.calendarId, args.query, args.timeMin, args.timeMax, args.maxResults, args.singleEvents, args.orderBy, args.showDeleted);
      case 'list_google_contacts':
        return await listContacts(args.query);
      case 'evaluate_expression':
        return await evaluateExpression(args.expression);
      case 'add_memory_entry':
        return await memorize(args.category, args.information);
      case 'delete_memory_entry':
        return await deleteInformation(args.category, args.information);
      case 'show_image':
        return { result: "image displayed" };
      case 'show_map':
        return { result: "map displayed" };
      case 'show_directions':
        return await getDirections(
          args.origin, args.destination, [],
          args.travelMode, args.arrivalTime, args.departureTime);
      case 'show_transit_directions':
        return await getDirections(
          args.origin, args.destination, [],
          "TRANSIT", args.arrivalTime, args.departureTime,
          undefined, undefined,
          args.mode || args.routingPreference ?
            { allowedTravelModes: args.modes, routingPreference: args.routingPreference }
            : undefined);
      case 'play_on_spotify':
        return await playOnSpotify(appContext.spotify, args.trackIds || [], args.contextUri);
      case 'find_artists_and_play_top_songs_on_spotify':
        return await playTopTracksOnSpotify(appContext.spotify, args.queries);
      case 'find_on_spotify':
        return await findOnSpotify(appContext.spotify, args.query, args.types, args.limit);
      case 'resume_spotify_playback':
        return await playOnSpotify(appContext.spotify, []);
      case 'pause_spotify_playback':
        return await pauseSpotifyPlayback(appContext.spotify);
      case 'spotify_skip_next':
        return await skipSpotifyPlaybackNext(appContext.spotify);
      case 'spotify_skip_previous':
        return await skipSpotifyPlaybackPrevious(appContext.spotify);
      default:
        return { error: `unknown function '${functionCall.name}'`};
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function getCurrentWeather(lat: number, lon: number) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`);
    if (!response.ok) {
      return { error: `HTTP request failed with status ${response.status}` };
    }
    const result = await response.json();
    return {
      result: {
        weather: result.weather[0].description,
        temperature: Math.round(result.main.temp - 273.15),
        temperature_feels_like: Math.round(result.main.feels_like - 273.15),
        humidity: result.main.humidity,
        wind_speed: result.wind.speed,
        wind_direction: result.wind.deg
      }
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function getWeatherForecast(lat: number, lon: number) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`);
    if (!response.ok) {
      return { error: `HTTP request failed with status ${response.status}` };
    }
    const result = await response.json();
    type ForecastEntry = {
      dt_txt: string,
      weather: { description: string }[],
      main: { temp: number, feels_like: number, humidity: number },
      wind: { speed: number, deg: number, gust?: number }
    }
    return {
      result: {
        sunrise: formatTimestamp(result.city.sunrise),
        sunset: formatTimestamp(result.city.sunset),
        forecast: result.list.map((entry: ForecastEntry) => ({
          time: entry.dt_txt,
          weather: entry.weather[0].description,
          temperature: Math.round(entry.main.temp - 273.15),
          temperature_feels_like: Math.round(entry.main.feels_like - 273.15),
          humidity: entry.main.humidity,
          wind_speed: entry.wind.speed,
          wind_direction: entry.wind.deg
        }))
      }
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
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

// async function searchKnowledgeGraph(query: string, limit: number = 1) {
//   const queryParams = new URLSearchParams();
//   queryParams.append("key", GoogleApiKey);
//   queryParams.append("query", query);
//   queryParams.append("indent", "true");
//   queryParams.append("limit", limit.toString());
//   const url = `https://kgsearch.googleapis.com/v1/entities:search?${queryParams.toString()}`;
//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       return { error: `HTTP request failed with status ${response.status}` };
//     }
//     return await response.json();
//   } catch (error) {
//     return { error: error instanceof Error ? error.message : "unknown error" };
//   }
// }

async function googleCustomSearch(query: string, maxResults: number = 1) {
  const queryParams = new URLSearchParams();
  queryParams.append("key", GoogleApiKey);
  queryParams.append("cx", GoogleCustomSearchEngineId);
  queryParams.append("q", query);
  queryParams.append("gl", navigator.language.substring(0, 2));
  queryParams.append("num", maxResults.toString());
//  queryParams.append("hl", navigator.language.substring(0, 2));
  const url = `https://customsearch.googleapis.com/customsearch/v1?${queryParams.toString()}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP request failed with status ${response.status}` };
    }
    type SearchResult = {
      title: string,
      link: string,
      snippet: string,
      pagemap: { cse_image: { src: string }[] }
    }
    const result = await response.json();
    return {
      result: result.items.map((item: SearchResult) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        imageLink: item.pagemap?.cse_image?.[0]?.src
      }))
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function getPlacesInfo(query: string, fields: string[], lat: number, lng: number, radius: number = 10000, maxResults = 5) {
  const requestBody = {
    "textQuery" : query,
    "locationBias": {
      "circle": {
        "center": {
          "latitude": lat,
          "longitude": lng
        },
        "radius": radius
      }
    },
    "maxResultCount": maxResults
  }
  const response = await fetch("/places-api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GoogleApiKey,
      "X-Goog-FieldMask": ["displayName", "location", ...fields].map(field => `places.${field}`).join(",")
    },
    body: JSON.stringify(requestBody)
  });
  const result = await response.json();
  // Clean up "periods" arrays to make response less confusing to the LLM
  for (const place of result.places) {
    delete place.currentOpeningHours?.periods;
  }
  console.log("found places:", result.places);
  return result;
}

type TravelMode = "DRIVE" | "BICYCLE" | "TRANSIT" | "WALK";
type TransitType = "BUS" | "SUBWAY" | "TRAIN" | "RAIL" | "LIGHT_RAIL";
type RoutingPreference = "TRAFFIC_UNAWARE" | "TRAFFIC_AWARE" | "TRAFFIC_AWARE_OPTIMAL";
type TrafficModel = "BEST_GUESS" | "OPTIMISTIC" | "PESSIMISTIC";

interface TransitPreferences {
  allowedTravelModes: TransitType[]
  routingPreference: "LESS_WALKING" | "FEWER_TRANSFERS"
}

interface Location {
  latLng: { latitude: number, longitude: number }
}

interface WayPoint {
  location?: Location
  address?: string
}

interface RoutesRequest {
  origin: WayPoint
  destination: WayPoint
  intermediates?: WayPoint[]
  travelMode: TravelMode
  routingPreference?: RoutingPreference
  departureTime?: string
  arrivalTime?: string
  languageCode?: string
  regionCode?: string
  trafficModel?: TrafficModel
  transitPreferences?: TransitPreferences
}

function toWayPoint(location: string): WayPoint {
  if (location.split(",").length === 2) {
    const latLng = location.split(",");
    const lat = parseFloat(latLng[0]);
    const lng = parseFloat(latLng[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { "location": { "latLng": { "latitude": lat, "longitude": lng } } };
    }
  }
  return { "address": location };
}

function toTravelMode(mode: string): TravelMode {
  switch (mode) {
    case "BICYCLING":
      return "BICYCLE";
    case "TRANSIT":
      return "TRANSIT";
    case "WALKING":
      return "WALK";
    default:
      return "DRIVE";
  }
}

async function getDirections(
  origin: string, destination: string, intermediates: string[] = [],
  travelMode: string = "DRIVING", arrivalTime: string = "", departureTime: string = "",
  trafficModel?: TrafficModel, routingPreference?: RoutingPreference,
  transitPreferences?: TransitPreferences,
  fields: string[] = []
) {
  const request: RoutesRequest = {
    origin: toWayPoint(origin),
    destination: toWayPoint(destination),
    travelMode: toTravelMode(travelMode),
//    regionCode: "de",
  }
  if (intermediates.length > 0) {
    request.intermediates = intermediates.map(intermediate => toWayPoint(intermediate));
  }
  if (arrivalTime) {
    request.arrivalTime = arrivalTime;
  }
  if (departureTime) {
    request.departureTime = departureTime;
  }
  if (trafficModel) {
    request.trafficModel = trafficModel;
  }
  if (routingPreference) {
    request.routingPreference = routingPreference;
  }
  if (transitPreferences) {
    request.transitPreferences = transitPreferences;
  }
  
  if (travelMode === "TRANSIT") {
    fields.push("legs.steps.transitDetails");
  }
  
  try {
    const response = await fetch("/directions-api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GoogleApiKey,
        "X-Goog-FieldMask": ["description", "duration", "distanceMeters", ...fields].map(field => `routes.${field}`).join(",")
      },
      body: JSON.stringify(request)
    });
    const result = await response.json();
    console.log("found directions:", result.routes);
    return result;
  } catch (error) {
    console.error(error);
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
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
  return { result: "timer deleted" };
}

async function createCalendarEvent(calendarId: string = "primary", summary: string, description: string, startTime: string, timeZone: string, durationInMinutes: number, recurrence?: string[], reminders?: { minutes: number, method: string }[]) {
  if (!gapi) {
    return { error: "Google integration is not enabled in the settings, or Google API failed to load" };
  }
  if (!gapi.client.getToken()) {
    return { error: "User is not signed into Google account, or has not given Calendar access permissions" };
  }
  const start = new Date(startTime);
  const event: gapi.client.calendar.EventInput = {
    summary,
    description: description || "",
    start: {
      dateTime: start.toISOString(),
      timeZone: timeZone,
    },
    end: {
      dateTime: new Date(start.getTime() + durationInMinutes * 60000).toISOString(),
      timeZone: timeZone,
    },
  };
  if (recurrence) {
    event.recurrence = recurrence;
  }
  if (reminders) {
    event.reminders = {
      useDefault: false,
      overrides: reminders.map(reminder => ({
        minutes: reminder.minutes,
        method: reminder.method
      }))
    }
  }
  try {
    const request = await gapi.client.calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      //@ts-expect-error the @types/gapi.calendar package is not up-to-date (https://developers.google.com/calendar/api/v3/reference/events/insert)
      sendUpdates: "all",
      conferenceDataVersion: 1,
    });
    window.dispatchEvent(new CustomEvent('refresh-upcoming-events'));
    return {
      result: request.result
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function deleteCalendarEvent(calendarId: string = "primary", eventId: string) {
  if (!gapi) {
    return { error: "Google integration is not enabled in the settings, or Google API failed to load" };
  }
  if (!gapi.client.getToken()) {
    return { error: "User is not signed into Google account, or has not given Calendar access permissions" };
  }
  try {
    const request = await gapi.client.calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      //@ts-expect-error the @types/gapi.calendar package is not up-to-date (https://developers.google.com/calendar/api/v3/reference/events/delete)
      sendUpdates: "all"
    });
    window.dispatchEvent(new CustomEvent('refresh-upcoming-events'));
    return request.status === 204 ? { result: "event deleted" } : { error: "unknown error" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function listCalendarEvents(calendarId: string = "primary", query: string, timeMin: string = (new Date()).toISOString(), timeMax: string, maxResults: number, singleEvents: boolean, orderBy: string, showDeleted: boolean) {
  if (!gapi) {
    return { error: "Google integration is not enabled in the settings, or Google API failed to load" };
  }
  if (!gapi.client.getToken()) {
    return { error: "User is not signed into Google account, or has not given Calendar access permissions" };
  }
  const parameters: gapi.client.calendar.EventsListParameters = {
    calendarId: calendarId,
    q: query,
    timeMin: timeMin,
    timeMax: timeMax,
    maxResults: maxResults,
    singleEvents: singleEvents,
    // @ts-expect-error - orderBy is not in the types
    orderBy: orderBy,
    showDeleted: showDeleted,
  };
  try {
    const request = await gapi.client.calendar.events.list(parameters);
    return {
      result: request.result.items
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function listContacts(query: string) {
  if (!gapi) {
    return { error: "Google integration is not enabled in the settings, or Google API failed to load" };
  }
  if (!gapi.client.getToken()) {
    return { error: "User is not signed into Google account, or has not given Contacts access permissions" };
  }
  try {
    type Contact = {
      id: string,
      displayName?: string,
      emailAddresses?: string[],
      notes?: string,
    }
    const contacts: Contact[] = [];
    const requestOptions: gapi.client.people.people.connections.ListParameters = {
      resourceName: 'people/me',
      pageSize: 100,
      personFields: 'names,emailAddresses,biographies'
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await gapi.client.people.people.connections.list(requestOptions);
      if (!response?.result?.connections) {
        break;
      }
      contacts.push(...response.result.connections.map(connection => {
        const contact: Contact = {
          id: connection.resourceName.split("/").pop() || ""
        };
        if (connection.names && connection.names[0].displayName) {
          contact.displayName = connection.names[0].displayName;
        }
        if (connection.emailAddresses) {
          contact.emailAddresses = connection.emailAddresses.map(email => email.value);
        }
        if (connection.biographies) {
          // @ts-expect-error - biographies is not in the types
          contact.notes = connection.biographies[0].value;
        }
        return contact;
      }));
      if (!response.result.nextPageToken) {
        break;
      }
      requestOptions.pageToken = response.result.nextPageToken;
    }
    if (query) {
      query = query.toLowerCase();
      return contacts.filter(contact => {
        if (contact.emailAddresses) {
          for (const email of contact.emailAddresses) {
            if (email.toLowerCase().includes(query)) {
              return true;
            }
          }
        }
        return !!(contact.displayName && contact.displayName.toLowerCase().includes(query))
          || !!(contact.notes && contact.notes.toLowerCase().includes(query));
      });
    }
    return contacts;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "unknown error" };
  }
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

async function findOnSpotify(spotify: Spotify | undefined, query: string, types: string[], limit: number | undefined) {
  if (!spotify) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  return await spotify.search(query, types, limit);
}

async function playOnSpotify(spotify: Spotify | undefined, trackIds: string[], contextUri?: string) {
  if (!spotify) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  return await spotify.play(spotify.deviceId, trackIds, contextUri);
}

async function playTopTracksOnSpotify(spotify: Spotify | undefined, artists: string[]) {
  if (!spotify) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  return await spotify.playTopTracks(spotify.deviceId, artists);
}

async function pauseSpotifyPlayback(spotify: Spotify | undefined) {
  if (!spotify) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  return await spotify.pausePlayback(spotify.deviceId);
}

async function skipSpotifyPlaybackNext(spotify: Spotify | undefined) {
  if (!spotify || !spotify.player) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  await spotify.player.nextTrack();
  return { result: "playback skipped" };
}

async function skipSpotifyPlaybackPrevious(spotify: Spotify | undefined) {
  if (!spotify || !spotify.player) {
    return { error: "Spotify integration not enabled, or not logged into Spotify" };
  }
  await spotify.player.previousTrack();
  return { result: "playback skipped" };
}