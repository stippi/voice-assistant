import {GeoLocation, LocationInfo} from "../model/location.ts";

export default function getLocation(info: LocationInfo) {
  if (info.lastLoaded && info.lastLoaded.getTime() > Date.now() - 1000 * 60 * 60) {
    return;
  }
  info.lastLoaded = new Date();
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      
      info.location = await getGeoLocation(position.coords.latitude, position.coords.longitude);
      
      console.log("got device location", info.location);
    }, (error) => {
      console.error("Error Code = " + error.code + " - " + error.message);
    });
  } else {
    console.log("Geolocation API is not available in your browser.");
  }
}

export async function getGeoLocation(lat: number, lng: number): Promise<GeoLocation> {
  // Use the Open-Street-Map's Nominatim API for reverse geocoding
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
  const data = await response.json();
  
  return {
    city: data.address.city || data.address.town || data.address.village,
    region: data.address.state || data.address.county || data.address.province,
    country: data.address.country,
    latitude: lat,
    longitude: lng,
  }
}