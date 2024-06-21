export interface UserInfo {
    location: GeoLocation;
    timers: Timer[];
}

export type GeoLocation = {
    country: string,
    region: string,
    city: string,
    longitude: number,
    latitude: number,
}

export type Timer = {
    id: string;
    title: string;
    type: "countdown" | "alarm";
    time: string;
    ringing?: boolean;
}