export type GeoLocation = {
  country: string,
  region: string,
  city: string,
  longitude: number,
  latitude: number,
}

export type LocationInfo = {
  location?: GeoLocation,
  lastLoaded?: Date,
}