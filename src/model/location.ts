export type Location = {
  country: string,
  region: string,
  city: string,
  longitude: number,
  latitude: number,
}

export type LocationInfo = {
  location?: Location,
  lastLoaded?: Date,
}