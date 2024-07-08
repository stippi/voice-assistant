import { indexDbGet, indexDbPut } from "../utils/indexDB";

export interface PerformanceTrackingService {
  trackMessageCreation(id: string, timestamp: number): Promise<void>;
}

type MessageEntry = {
  creationTime: number;
};

type PerformanceRecords = Record<string, MessageEntry>;

abstract class BasePerformanceTrackingService implements PerformanceTrackingService {
  abstract trackMessageCreation(id: string, timestamp: number): Promise<void>;
}

class IndexDbPerformanceTrackingService extends BasePerformanceTrackingService {
  constructor() {
    super();
  }

  async trackMessageCreation(id: string, timestamp: number): Promise<void> {
    const performanceRecords = (await indexDbGet<PerformanceRecords>("performance-records")) || {};
    performanceRecords[id] = { ...performanceRecords[id], creationTime: timestamp };
    await indexDbPut("performance-records", performanceRecords);
  }
}

const indexDbTrackingService = new IndexDbPerformanceTrackingService();

export function createPerformanceTrackingService(): PerformanceTrackingService {
  return indexDbTrackingService;
}
