import { indexDbGet, indexDbPut } from "../utils/indexDB";

export interface PerformanceData {
  "transcription-started": number;
  "transcription-finished": number;
  "streaming-started": number;
  "first-content-received": number;
  "streaming-finished": number;
  "tool-execution-started": number;
  "tool-execution-finished": number;
  "spoken-response-started": number;
  "spoken-response-finished": number;
}

type PerformanceRecords = Record<string, PerformanceData>;

export interface PerformanceTrackingService {
  trackTimestamp(id: string, what: string, timestamp: number): Promise<void>;
  getStats(id: string): Promise<PerformanceData>;
}

abstract class BasePerformanceTrackingService implements PerformanceTrackingService {
  abstract trackTimestamp(id: string, what: string, timestamp: number): Promise<void>;
  abstract getStats(id: string): Promise<PerformanceData>;
}

class IndexDbPerformanceTrackingService extends BasePerformanceTrackingService {
  private lastOperation = Promise.resolve();

  constructor() {
    super();
  }

  async trackTimestamp(id: string, what: keyof PerformanceData, timestamp: number): Promise<void> {
    this.lastOperation = this.lastOperation.then(async () => {
      const performanceRecords = (await indexDbGet<PerformanceRecords>("performance-records")) || {};
      console.log("tracking", id, what, new Date(timestamp).toISOString());
      performanceRecords[id] = { ...performanceRecords[id], [what]: timestamp };
      await indexDbPut("performance-records", performanceRecords);
    });
    return this.lastOperation;
  }

  async getStats(id: string): Promise<PerformanceData> {
    const performanceRecords = (await indexDbGet<PerformanceRecords>("performance-records")) || {};
    return performanceRecords[id];
  }
}

const indexDbTrackingService = new IndexDbPerformanceTrackingService();

export function createPerformanceTrackingService(): PerformanceTrackingService {
  return indexDbTrackingService;
}
