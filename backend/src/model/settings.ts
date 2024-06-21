export type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type Personality = "curious" | "professional" | "friendly" | "peppy" | "snarky" | "silly" | "zen";

export type Settings = {
    voice: Voice;
    personality: Personality;
    openMic: boolean;
    expectResponse: boolean;
    triggerPhrase: string;
    triggerWord: string;
    stopWords: string[];
    audioSpeed: number;
    useWhisper: boolean;
    transcriptionLanguage: string;

    enableGoogle: boolean;
    enableGoogleCalendar: boolean;
    enableGoogleMaps: boolean;
    enableGooglePhotos: boolean;
    enableSpotify: boolean;
    enableMicrosoft: boolean;
    enableNewsApiOrg: boolean;
    enableOpenWeatherMap: boolean;

    showTimers: boolean;
    showUpcomingEvents: boolean;
    showPlaylist: boolean;
    showPhotos: boolean;
}