/**
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

const dataMap = new WeakMap();

/**
 * Normalizes a Float32Array to Array(m): We use this to draw amplitudes on a graph
 * If we're rendering the same audio data, then we'll often be using
 * the same (data, m, downsamplePeaks) triplets so we give option to memoize
 */
const normalizeArray = (data: Float32Array, m: number, downsamplePeaks: boolean = false, memoize: boolean = false) => {
  let cache, mKey, dKey;
  if (memoize) {
    mKey = m.toString();
    dKey = downsamplePeaks.toString();
    cache = dataMap.has(data) ? dataMap.get(data) : {};
    dataMap.set(data, cache);
    cache[mKey] = cache[mKey] || {};
    if (cache[mKey][dKey]) {
      return cache[mKey][dKey];
    }
  }
  const n = data.length;
  const result = new Array(m);
  if (m <= n) {
    // Downsampling
    result.fill(0);
    const count = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      const index = Math.floor(i * (m / n));
      if (downsamplePeaks) {
        // take highest result in the set
        result[index] = Math.max(result[index], Math.abs(data[i]));
      } else {
        result[index] += Math.abs(data[i]);
      }
      count[index]++;
    }
    if (!downsamplePeaks) {
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] / count[i];
      }
    }
  } else {
    for (let i = 0; i < m; i++) {
      const index = (i * (n - 1)) / (m - 1);
      const low = Math.floor(index);
      const high = Math.ceil(index);
      const t = index - low;
      if (high >= n) {
        result[i] = data[n - 1];
      } else {
        result[i] = data[low] * (1 - t) + data[high] * t;
      }
    }
  }
  if (memoize) {
    cache[mKey as string][dKey as string] = result;
  }
  return result;
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};
export const AudioVisualizer = {
  /**
   * Renders circular bars around a center point
   * @param canvas Canvas element
   * @param ctx Canvas context
   * @param data Frequency data
   * @param color Bar color (including alpha)
   * @param centerX Center X coordinate
   * @param centerY Center Y coordinate
   * @param innerRadius Starting radius for bars
   * @param outerRadius Maximum radius for bars
   * @param barCount Number of bars to draw
   */
  drawCircularBars: (
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    color: string,
    centerX: number,
    centerY: number,
    innerRadius: number,
    outerRadius: number,
    barCount: number = 60
  ) => {
    const points = normalizeArray(data, barCount, true);
    const angleStep = 360 / barCount;

    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < barCount; i++) {
      const amplitude = Math.abs(points[i]);
      const startAngle = i * angleStep;
      const endAngle = startAngle + (angleStep * 0.8); // Leave small gap between bars

      const barLength = amplitude * (outerRadius - innerRadius);
      const radius = innerRadius + barLength;

      const start = polarToCartesian(0, 0, innerRadius, startAngle);
      const end = polarToCartesian(0, 0, radius, startAngle);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.arc(0, 0, radius, (startAngle - 90) * Math.PI / 180, (endAngle - 90) * Math.PI / 180);
      ctx.lineTo(
        innerRadius * Math.cos((endAngle - 90) * Math.PI / 180),
        innerRadius * Math.sin((endAngle - 90) * Math.PI / 180)
      );
      ctx.arc(0, 0, innerRadius, (endAngle - 90) * Math.PI / 180, (startAngle - 90) * Math.PI / 180, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.restore();
  },
  /**
   * Renders a point-in-time snapshot of an audio sample, usually frequency values
   * @param canvas
   * @param ctx
   * @param data
   * @param color
   * @param pointCount number of bars to render
   * @param barWidth width of bars in px
   * @param barSpacing spacing between bars in px
   * @param center vertically center the bars
   */
  drawBars: (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    data: Float32Array,
    color: string,
    pointCount: number = 0,
    barWidth: number = 0,
    barSpacing: number = 0,
    center: boolean = false,
  ) => {
    pointCount = Math.floor(Math.min(pointCount, (canvas.width - barSpacing) / (Math.max(barWidth, 1) + barSpacing)));
    if (!pointCount) {
      pointCount = Math.floor((canvas.width - barSpacing) / (Math.max(barWidth, 1) + barSpacing));
    }
    if (!barWidth) {
      barWidth = (canvas.width - barSpacing) / pointCount - barSpacing;
    }
    const points = normalizeArray(data, pointCount, true);
    for (let i = 0; i < pointCount; i++) {
      const amplitude = Math.abs(points[i]);
      const height = Math.max(1, amplitude * canvas.height);
      const x = barSpacing + i * (barWidth + barSpacing);
      const y = center ? (canvas.height - height) / 2 : canvas.height - height;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, height);
    }
  },
};
