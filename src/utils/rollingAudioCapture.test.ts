import { describe, it, expect } from "vitest";
import { RollingAudioCapture } from "./rollingAudioCapture";

describe("RollingAudioCapture", () => {
  it("should have no buffers initially", () => {
    const capture = new RollingAudioCapture({ maxBuffers: 3 });
    expect(capture.countBuffers()).toEqual(0);
  });
  it("should contain 2 buffers", () => {
    const capture = new RollingAudioCapture({ maxBuffers: 3 });
    capture.appendBuffer(new Int16Array(1));
    capture.appendBuffer(new Int16Array(2));
    expect(capture.countBuffers()).toEqual(2);
  });
  it("should contain 1 buffer", () => {
    const capture = new RollingAudioCapture({ maxBuffers: 1 });
    capture.appendBuffer(new Int16Array(1));
    capture.appendBuffer(new Int16Array(2));
    expect(capture.countBuffers()).toEqual(1);
    expect(capture.getBuffer(0).length).toEqual(2);
  });
  it("should return the oldest buffer first", () => {
    const capture = new RollingAudioCapture({ maxBuffers: 2 });
    capture.appendBuffer(new Int16Array(1));
    capture.appendBuffer(new Int16Array(2));
    capture.appendBuffer(new Int16Array(3));
    expect(capture.getBuffer(0).length).toEqual(2);
    expect(capture.getBuffer(1).length).toEqual(3);
  });
});
