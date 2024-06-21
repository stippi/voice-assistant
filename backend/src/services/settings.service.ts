import {Settings} from "../model/settings";
import {DataStorageService} from "./datastorage.service";

const defaultSettings: Settings = {
    voice: "onyx",
    personality: "snarky",
    openMic: true,
    expectResponse: true,
    triggerPhrase: "Computer",
    triggerWord: "Computer",
    stopWords: ["Stop", "Cancel", "Nevermind"],
    audioSpeed: 1,
    useWhisper: true,
    transcriptionLanguage: "en-US",

    enableGoogle: false,
    enableGoogleCalendar: true,
    enableGoogleMaps: true,
    enableGooglePhotos: true,
    enableMicrosoft: false,
    enableSpotify: false,
    enableNewsApiOrg: false,
    enableOpenWeatherMap: true,

    showTimers: true,
    showUpcomingEvents: true,
    showPlaylist: false,
    showPhotos: true,
}


const COLLECTION_NAME = 'user-settings';

export class SettingsService {

    private storage = new DataStorageService<Settings>(COLLECTION_NAME);

    async getSettings(userId: string): Promise<Settings> {
        if (!await this.storage.hasObject(userId)) {
            return defaultSettings;
        }

        return {...defaultSettings, ...await this.storage.getObject(userId)};
    }

    async updateSettings(userId: string, settings: Settings) {
        return this.storage.saveObject(userId, settings);
    }
}