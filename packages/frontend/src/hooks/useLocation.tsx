import useSWR from "swr";
import {GeoLocation} from "../model/location.ts";

async function getGeoLocation(lat: number, lng: number): Promise<GeoLocation> {
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

async function getDeviceLocation(): Promise<GeoLocation> {
  if (!("geolocation" in navigator)) {
    throw new Error("Geolocation API is not available in your browser.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      resolve(await getGeoLocation(position.coords.latitude, position.coords.longitude));
    }, (error) => {
      console.error("Error Code = " + error.code + " - " + error.message);
      reject(error);
    });
  });
}

export default function useLocation() {
  const swr = useSWR<GeoLocation>(
    "location",
    getDeviceLocation
  );
  return {
    location: swr.data,
    ...swr,
  };
}