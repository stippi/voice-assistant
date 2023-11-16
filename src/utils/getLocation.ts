import {LocationInfo} from "../model/location.ts";

export default function getLocation(info: LocationInfo) {
  if (info.lastLoaded && info.lastLoaded.getTime() > Date.now() - 1000 * 60 * 60) {
    return;
  }
  info.lastLoaded = new Date();
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Use the Open-Street-Map's Nominatim API for reverse geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      info.location = {
        city: data.address.city || data.address.town || data.address.village,
        region: data.address.state || data.address.county || data.address.province,
        country: data.address.country
      }
      
      console.log(`got device location: ${info.location.city}, ${info.location.region}, ${info.location.country}`);
    }, (error) => {
      console.error("Error Code = " + error.code + " - " + error.message);
    });
  } else {
    console.log("Geolocation API is not available in your browser.");
  }
}