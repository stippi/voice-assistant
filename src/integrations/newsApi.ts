import {NewsApiOrgKey} from "../secrets.ts";

export const newsApiLanguageParam = {
  type: "string",
  enum: [ "ar", "de", "en", "es", "fr", "he", "it", "nl", "no", "pt", "ru", "sv", "ud", "zh" ]
};

export const newsApiCountryParam = {
  type: "string",
  enum: [
    "ae", "ar", "at", "au", "be", "bg", "br", "ca", "ch", "cn", "co", "cu", "cz", "de", "eg",
    "fr", "gb", "gr", "hk", "hu", "id", "ie", "il", "in", "it", "jp", "kr", "lt", "lv", "ma",
    "mx", "my", "ng", "nl", "no", "nz", "ph", "pl", "pt", "ro", "rs", "ru", "sa", "se", "sg",
    "si", "sk", "th", "tr", "tw", "ua", "us", "ve", "za"
  ]
}

export const newsApiCategoryParam = {
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

export async function getTopNews(
  language: string,
  country: string,
  category: string,
  query: string,
  sortBy: string
) {
  const queryParams = new URLSearchParams();
  queryParams.append("apiKey", NewsApiOrgKey);
  queryParams.append("pageSize", "10");
  if (language) queryParams.append("language", language);
  if (country) queryParams.append("country", country);
  if (category) queryParams.append("category", category);
  if (query) queryParams.append("q", query);
  if (sortBy) queryParams.append("sortBy", sortBy);
  const url = `https://newsapi.org/v2/top-headlines?${queryParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }
  return await response.json();
}

export async function getNews(
  language: string,
  country: string,
  query: string,
  sources: string,
  searchIn: string,
  from: string,
  to: string,
  sortBy: string
) {
  const queryParams = new URLSearchParams();
  queryParams.append("apiKey", NewsApiOrgKey);
  queryParams.append("pageSize", "10");
  if (language) queryParams.append("language", language);
  if (country) queryParams.append("country", country);
  if (query) queryParams.append("q", query);
  if (sources) queryParams.append("sources", sources);
  if (searchIn) queryParams.append("searchIn", searchIn);
  if (from) queryParams.append("from", from);
  if (to) queryParams.append("to", to);
  if (sortBy) queryParams.append("sortBy", sortBy);
  const url = `https://newsapi.org/v2/everything?${queryParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }
  return await response.json();
}
