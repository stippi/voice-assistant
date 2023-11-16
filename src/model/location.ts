export type Location = {
  country: string,
  region: string,
  city: string,
}

export type LocationInfo = {
  location?: Location,
  lastLoaded?: Date,
}