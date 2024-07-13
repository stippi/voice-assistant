import { LoginFlow } from "../utils/loginFlow";
import { GoogleApiKey, GoogleClientId, GoogleClientSecret, GoogleCustomSearchEngineId } from "../config";

export const loginFlow = new LoginFlow({
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  additionalParams: {
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  },
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  additionalTokenParams: {
    client_secret: GoogleClientSecret,
  },
  callbackPath: "/google-callback",
  clientId: GoogleClientId,
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/cloud-platform", // For testing Gemini Pro
    "https://www.googleapis.com/auth/photoslibrary.readonly",
  ],
  storagePrefix: "google",
});

export async function googleCustomSearch(query: string, maxResults: number = 1) {
  const queryParams = new URLSearchParams();
  queryParams.append("key", GoogleApiKey);
  queryParams.append("cx", GoogleCustomSearchEngineId);
  queryParams.append("q", query);
  queryParams.append("gl", navigator.language.substring(0, 2));
  queryParams.append("num", maxResults.toString());
  //  queryParams.append("hl", navigator.language.substring(0, 2));
  const url = `https://customsearch.googleapis.com/customsearch/v1?${queryParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.statusText}`);
  }
  type SearchResult = {
    title: string;
    link: string;
    snippet: string;
    pagemap: { cse_image: { src: string }[] };
  };
  const result = await response.json();
  return {
    result: result.items.map((item: SearchResult) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      imageLink: item.pagemap?.cse_image?.[0]?.src,
    })),
  };
}

export async function getPlacesInfo(
  query: string,
  fields: string[],
  lat: number,
  lng: number,
  radius: number = 10000,
  maxResults = 5,
) {
  const requestBody = {
    textQuery: query,
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng,
        },
        radius: radius,
      },
    },
    maxResultCount: maxResults,
  };
  const response = await fetch("/places-api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GoogleApiKey,
      "X-Goog-FieldMask": ["displayName", "location", ...fields].map((field) => `places.${field}`).join(","),
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch places: ${response.statusText}`);
  }
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
  allowedTravelModes: TransitType[];
  routingPreference: "LESS_WALKING" | "FEWER_TRANSFERS";
}

interface Location {
  latLng: { latitude: number; longitude: number };
}

interface WayPoint {
  location?: Location;
  address?: string;
}

interface RoutesRequest {
  origin: WayPoint;
  destination: WayPoint;
  intermediates?: WayPoint[];
  travelMode: TravelMode;
  routingPreference?: RoutingPreference;
  departureTime?: string;
  arrivalTime?: string;
  languageCode?: string;
  regionCode?: string;
  trafficModel?: TrafficModel;
  transitPreferences?: TransitPreferences;
}

function toWayPoint(location: string): WayPoint {
  if (location.split(",").length === 2) {
    const latLng = location.split(",");
    const lat = parseFloat(latLng[0]);
    const lng = parseFloat(latLng[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { location: { latLng: { latitude: lat, longitude: lng } } };
    }
  }
  return { address: location };
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

export async function getDirections(
  origin: string,
  destination: string,
  intermediates: string[] = [],
  travelMode: string = "DRIVING",
  arrivalTime: string = "",
  departureTime: string = "",
  trafficModel?: TrafficModel,
  routingPreference?: RoutingPreference,
  transitPreferences?: TransitPreferences,
  fields: string[] = [],
) {
  const request: RoutesRequest = {
    origin: toWayPoint(origin),
    destination: toWayPoint(destination),
    travelMode: toTravelMode(travelMode),
    //    regionCode: "de",
  };
  if (intermediates.length > 0) {
    request.intermediates = intermediates.map((intermediate) => toWayPoint(intermediate));
  }
  if (arrivalTime) {
    request.arrivalTime = new Date(arrivalTime).toISOString();
  }
  if (departureTime) {
    request.departureTime = new Date(departureTime).toISOString();
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

  const response = await fetch("/directions-api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GoogleApiKey,
      "X-Goog-FieldMask": ["description", "duration", "distanceMeters", ...fields]
        .map((field) => `routes.${field}`)
        .join(","),
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch directions: ${response.statusText}`);
  }
  const result = await response.json();
  console.log("found directions:", result.routes);
  return result;
}

function toISOStringNoTimezone(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const result = `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
  console.log(`Date without timezone: ${date} -> ${result}`);
  return result;
}

export async function createCalendarEvent(
  calendarId: string = "primary",
  summary: string,
  description: string,
  location: string,
  attendees: { email: string }[],
  startTime: string,
  timeZone: string,
  durationInMinutes: number,
  recurrence?: string[],
  reminders?: { minutes: number; method: string }[],
) {
  if (!gapi) {
    return {
      error: "Google integration is not enabled in the settings, or Google API failed to load",
    };
  }
  if (!gapi.client.getToken()) {
    return {
      error: "User is not signed into Google account, or has not given Calendar access permissions",
    };
  }
  const start = new Date(startTime);
  const event: gapi.client.calendar.EventInput = {
    summary,
    description: description || "",
    location: location || "",
    attendees: attendees || [],
    start: {
      dateTime: toISOStringNoTimezone(start),
      timeZone: timeZone,
    },
    end: {
      dateTime: toISOStringNoTimezone(new Date(start.getTime() + durationInMinutes * 60000)),
      timeZone: timeZone,
    },
  };
  if (recurrence) {
    event.recurrence = recurrence;
  }
  if (reminders && !Array.isArray(reminders)) {
    reminders = [reminders];
  }
  if (reminders) {
    event.reminders = {
      useDefault: false,
      overrides: reminders.map((reminder) => ({
        minutes: reminder.minutes,
        method: reminder.method,
      })),
    };
  }
  const request = await gapi.client.calendar.events.insert({
    calendarId: calendarId,
    resource: event,
    //@ts-expect-error the @types/gapi.calendar package is not up-to-date (https://developers.google.com/calendar/api/v3/reference/events/insert)
    sendUpdates: "all",
    conferenceDataVersion: 1,
  });
  window.dispatchEvent(new CustomEvent("refresh-upcoming-events"));
  return {
    result: request.result,
  };
}

export async function deleteCalendarEvent(calendarId: string = "primary", eventId: string) {
  if (!gapi) {
    return {
      error: "Google integration is not enabled in the settings, or Google API failed to load",
    };
  }
  if (!gapi.client.getToken()) {
    return {
      error: "User is not signed into Google account, or has not given Calendar access permissions",
    };
  }
  const request = await gapi.client.calendar.events.delete({
    calendarId: calendarId,
    eventId: eventId,
    //@ts-expect-error the @types/gapi.calendar package is not up-to-date (https://developers.google.com/calendar/api/v3/reference/events/delete)
    sendUpdates: "all",
  });
  window.dispatchEvent(new CustomEvent("refresh-upcoming-events"));
  return request.status === 204 ? { result: "event deleted" } : { error: "unknown error" };
}

export async function listCalendarEvents(
  calendarId: string = "primary",
  query: string,
  timeMin: string = new Date().toISOString(),
  timeMax: string,
  maxResults: number,
  singleEvents: boolean,
  orderBy: gapi.client.calendar.EventsOrder,
  showDeleted: boolean,
) {
  if (!gapi) {
    return {
      error: "Google integration is not enabled in the settings, or Google API failed to load",
    };
  }
  if (!gapi.client.getToken()) {
    return {
      error: "User is not signed into Google account, or has not given Calendar access permissions",
    };
  }
  const parameters: gapi.client.calendar.EventsListParameters = {
    calendarId: calendarId,
  };
  if (query) {
    parameters.q = query;
  }
  if (timeMin) {
    parameters.timeMin = new Date(timeMin).toISOString();
  }
  if (timeMax) {
    parameters.timeMax = new Date(timeMax).toISOString();
  }
  if (maxResults) {
    parameters.maxResults = maxResults;
  }
  if (orderBy) {
    parameters.orderBy = orderBy;
  }
  if (singleEvents != undefined) {
    parameters.singleEvents = singleEvents;
  }
  if (showDeleted != undefined) {
    parameters.showDeleted = showDeleted;
  }
  const request = await gapi.client.calendar.events.list(parameters);
  return {
    result: request.result.items,
  };
}

export async function listContacts(query: string) {
  if (!gapi) {
    return {
      error: "Google integration is not enabled in the settings, or Google API failed to load",
    };
  }
  if (!gapi.client.getToken()) {
    return {
      error: "User is not signed into Google account, or has not given Contacts access permissions",
    };
  }
  type Contact = {
    id: string;
    displayName?: string;
    emailAddresses?: string[];
    notes?: string;
  };
  const contacts: Contact[] = [];
  const requestOptions: gapi.client.people.people.connections.ListParameters = {
    resourceName: "people/me",
    pageSize: 100,
    personFields: "names,emailAddresses,biographies",
  };
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await gapi.client.people.people.connections.list(requestOptions);
    if (!response?.result?.connections) {
      break;
    }
    contacts.push(
      ...response.result.connections.map((connection) => {
        const contact: Contact = {
          id: connection.resourceName.split("/").pop() || "",
        };
        if (connection.names && connection.names[0].displayName) {
          contact.displayName = connection.names[0].displayName;
        }
        if (connection.emailAddresses) {
          contact.emailAddresses = connection.emailAddresses.map((email) => email.value);
        }
        if (connection.biographies) {
          // @ts-expect-error - biographies is not in the types
          contact.notes = connection.biographies[0].value;
        }
        return contact;
      }),
    );
    if (!response.result.nextPageToken) {
      break;
    }
    requestOptions.pageToken = response.result.nextPageToken;
  }
  if (query) {
    query = query.toLowerCase();
    return contacts.filter((contact) => {
      if (contact.emailAddresses) {
        for (const email of contact.emailAddresses) {
          if (email.toLowerCase().includes(query)) {
            return true;
          }
        }
      }
      return (
        !!(contact.displayName && contact.displayName.toLowerCase().includes(query)) ||
        !!(contact.notes && contact.notes.toLowerCase().includes(query))
      );
    });
  }
  return contacts;
}

async function callApi<T>(url: string, options: RequestInit = {}, expectResponse = true): Promise<T> {
  const accessToken = await loginFlow.getAccessToken();
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await fetch(url, options);
  if (response.ok) {
    if (!expectResponse) {
      return {} as T;
    }
    return await response.json();
  } else {
    throw new Error(`Google API error: ${response.status} ${response.statusText}`);
  }
}

export type MediaItem = {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
  };
  filename: string;
};

export async function fetchFavoritePhotos(limit: number): Promise<MediaItem[]> {
  const filters = {
    mediaTypeFilter: {
      mediaTypes: ["PHOTO"],
    },
    featureFilter: {
      includedFeatures: ["FAVORITES"],
    },
  };

  const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await loginFlow.getAccessToken()}`,
    },
  };

  // Continuously fetch paged media items until the limit is reached
  let pageToken = "";
  let allMediaItems: MediaItem[] = [];
  do {
    const body = {
      pageSize: 10,
      pageToken: pageToken,
      filters,
    };
    options.body = JSON.stringify(body);

    type Response = {
      mediaItems: MediaItem[];
      nextPageToken: string;
    };
    const response = await callApi<Response>(url, options, true);
    if (response.mediaItems) {
      allMediaItems = allMediaItems.concat(response.mediaItems);
    }
    pageToken = response.nextPageToken;
  } while (pageToken && allMediaItems.length < limit);

  // Truncate the list to the requested limit
  return allMediaItems.slice(0, limit);
}

export async function fetchMediaItem(mediaItemId: string): Promise<MediaItem> {
  const url = `https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItemId}`;
  return callApi<MediaItem>(url, {}, true);
}
