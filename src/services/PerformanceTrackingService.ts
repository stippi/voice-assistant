import { indexDbGet, indexDbPut } from "../utils/indexDB";

export interface PerformanceTrackingService {
  trackTimestamp(id: string, what: string, timestamp: number): Promise<void>;
}

type MessageEntry = {
  [key: string]: number;
};

type PerformanceRecords = Record<string, MessageEntry>;

abstract class BasePerformanceTrackingService implements PerformanceTrackingService {
  abstract trackTimestamp(id: string, what: string, timestamp: number): Promise<void>;
}

class IndexDbPerformanceTrackingService extends BasePerformanceTrackingService {
  constructor() {
    super();
  }

  async trackTimestamp(id: string, what: string, timestamp: number): Promise<void> {
    const performanceRecords = (await indexDbGet<PerformanceRecords>("performance-records")) || {};
    performanceRecords[id] = { ...performanceRecords[id], [what]: timestamp };
    await indexDbPut("performance-records", performanceRecords);
  }
}

const indexDbTrackingService = new IndexDbPerformanceTrackingService();

export function createPerformanceTrackingService(): PerformanceTrackingService {
  return indexDbTrackingService;
}
