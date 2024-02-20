import {OpenWeatherMapApiKey} from "../secrets.ts";
import {formatTimestamp} from "../utils/timeFormat.ts";

export async function getCurrentWeather(lat: number, lon: number) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP request failed with status ${response.status}`);
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
}

export async function getWeatherForecast(lat: number, lon: number) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OpenWeatherMapApiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP request failed with status ${response.status}`);
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
}
