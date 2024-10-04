/*
MIT License

Copyright (c) 2024 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { noteFrequencies, noteFrequencyLabels, voiceFrequencies, voiceFrequencyLabels } from "./AudioConstants";

export type AnalysisType = "frequency" | "music" | "voice";

/**
 * Analyzes audio for visual output
 */
export class AudioAnalysisService {
  /**
   * Retrieves frequency domain data from an AnalyserNode adjusted to a decibel range
   * returns human-readable formatting and labels
   */
  static getFrequencies(
    analyser: AnalyserNode,
    sampleRate: number,
    fftResult: Float32Array | null,
    analysisType: AnalysisType = "frequency",
    minDecibels = -100,
    maxDecibels = -30,
  ) {
    if (!fftResult) {
      fftResult = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(fftResult);
    }
    const nyquistFrequency = sampleRate / 2;
    const frequencyStep = (1 / fftResult.length) * nyquistFrequency;
    let outputValues;
    let frequencies;
    let labels;
    if (analysisType === "music" || analysisType === "voice") {
      const useFrequencies = analysisType === "voice" ? voiceFrequencies : noteFrequencies;
      const aggregateOutput = Array(useFrequencies.length).fill(minDecibels);
      for (let i = 0; i < fftResult.length; i++) {
        const frequency = i * frequencyStep;
        const amplitude = fftResult[i];
        for (let n = useFrequencies.length - 1; n >= 0; n--) {
          if (frequency > useFrequencies[n]) {
            aggregateOutput[n] = Math.max(aggregateOutput[n], amplitude);
            break;
          }
        }
      }
      outputValues = aggregateOutput;
      frequencies = analysisType === "voice" ? voiceFrequencies : noteFrequencies;
      labels = analysisType === "voice" ? voiceFrequencyLabels : noteFrequencyLabels;
    } else {
      outputValues = Array.from(fftResult);
      frequencies = outputValues.map((_, i) => frequencyStep * i);
      labels = frequencies.map((f) => `${f.toFixed(2)} Hz`);
    }
    // We normalize to {0, 1}
    const normalizedOutput = outputValues.map((v) => {
      return Math.max(0, Math.min((v - minDecibels) / (maxDecibels - minDecibels), 1));
    });
    const values = new Float32Array(normalizedOutput);
    return {
      values,
      frequencies,
      labels,
    };
  }

  private fftResults: Float32Array[];
  private context: AudioContext | OfflineAudioContext;
  private audio: HTMLAudioElement;
  private analyser: AnalyserNode;
  private sampleRate: number;
  private audioBuffer: AudioBuffer | null;

  /**
   * Creates a new AudioAnalysis instance for an HTMLAudioElement
   */
  constructor(audioElement: HTMLAudioElement, audioBuffer: AudioBuffer | null = null) {
    this.fftResults = [];
    if (audioBuffer) {
      /**
       * Modified from
       * https://stackoverflow.com/questions/75063715/using-the-web-audio-api-to-analyze-a-song-without-playing
       *
       * We do this to populate FFT values for the audio if provided an `audioBuffer`
       * The reason to do this is that Safari fails when using `createMediaElementSource`
       * This has a non-zero RAM cost so we only opt-in to run it on Safari, Chrome is better
       */
      const { length, sampleRate } = audioBuffer;
      const offlineAudioContext = new OfflineAudioContext({
        length,
        sampleRate,
      });
      const source = offlineAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      const analyser = offlineAudioContext.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);
      // limit is :: 128 / sampleRate;
      // but we just want 60fps - cuts ~1s from 6MB to 1MB of RAM
      const renderQuantumInSeconds = 1 / 60;
      const durationInSeconds = length / sampleRate;
      const analyze = (index: number) => {
        const suspendTime = renderQuantumInSeconds * index;
        if (suspendTime < durationInSeconds) {
          offlineAudioContext.suspend(suspendTime).then(() => {
            const fftResult = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(fftResult);
            this.fftResults.push(fftResult);
            analyze(index + 1);
          });
        }
        if (index === 1) {
          offlineAudioContext.startRendering();
        } else {
          offlineAudioContext.resume();
        }
      };
      source.start(0);
      analyze(1);
      this.audio = audioElement;
      this.context = offlineAudioContext;
      this.analyser = analyser;
      this.sampleRate = sampleRate;
      this.audioBuffer = audioBuffer;
    } else {
      this.context = new AudioContext();
      const track = this.context.createMediaElementSource(audioElement);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.1;
      track.connect(analyser);
      analyser.connect(this.context.destination);
      this.audio = audioElement;
      this.analyser = analyser;
      this.sampleRate = this.context.sampleRate;
      this.audioBuffer = null;
    }
  }

  /**
   * Gets the current frequency domain data from the playing audio track
   */
  getFrequencies(analysisType: AnalysisType = "frequency", minDecibels = -100, maxDecibels = -30) {
    let fftResult: Float32Array | null = null;
    if (this.audioBuffer && this.fftResults.length) {
      const pct = this.audio.currentTime / this.audio.duration;
      const index = Math.min((pct * this.fftResults.length) | 0, this.fftResults.length - 1);
      fftResult = this.fftResults[index];
    }
    return AudioAnalysisService.getFrequencies(
      this.analyser,
      this.sampleRate,
      fftResult,
      analysisType,
      minDecibels,
      maxDecibels,
    );
  }

  /**
   * Resume the internal AudioContext if it was suspended due to the lack of
   * user interaction when the AudioAnalysis was instantiated.
   */
  async resumeIfSuspended(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }
}
