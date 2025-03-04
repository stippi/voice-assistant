// Import ONNX Runtime Web
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js');

// State variables
let session = null;
let threshold = 0.5;
let minSpeechFrames = 2;
let silenceFrames = 5;
let speechFrameCount = 0;
let silenceFrameCount = 0;
let isSpeech = false;

// Helper function to convert audio data to the format expected by the model
function prepareAudioInput(audioFrame) {
  // Convert Int16Array to Float32Array
  const floatArray = new Float32Array(audioFrame.length);
  for (let i = 0; i < audioFrame.length; i++) {
    // Normalize 16-bit PCM to float within [-1, 1]
    floatArray[i] = audioFrame[i] / 32768.0;
  }

  // Assuming model expects 16kHz mono audio
  // You might need to resample if the incoming audio is not 16kHz

  // Create a tensor from the audio data
  const tensor = new ort.Tensor('float32', floatArray, [1, floatArray.length]);
  return { input: tensor };
}

// Main message handler
self.onmessage = async function (e) {
  const data = e.data;

  switch (data.command) {
    case 'init':
      // Initialize with options
      threshold = data.options.threshold ?? threshold;
      minSpeechFrames = data.options.minSpeechFrames ?? minSpeechFrames;
      silenceFrames = data.options.silenceFrames ?? silenceFrames;

      try {
        // Initialize ONNX runtime session
        const modelUrl = data.options.modelUrl ?? '/models/silero_vad.onnx';

        // Set execution providers - WebAssembly is typically used in browsers
        const sessionOptions = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        };

        // Create session and load model
        session = await ort.InferenceSession.create(modelUrl, sessionOptions);

        self.postMessage({ status: 'ready' });
      } catch (error) {
        console.error('Failed to initialize Silero VAD model:', error);
        self.postMessage({
          status: 'error',
          error: error.message || 'Failed to initialize Silero VAD model'
        });
      }
      break;

    case 'process':
      if (!session) {
        self.postMessage({
          status: 'error',
          error: 'Model not initialized'
        });
        return;
      }

      try {
        const audioFrame = data.frame;
        const feeds = prepareAudioInput(audioFrame);

        // Run inference
        const results = await session.run(feeds);

        // Extract result (assuming the model outputs a single probability value)
        const outputTensor = results.output;
        const probability = outputTensor.data[0];

        // Apply threshold and count frames
        if (probability > threshold) {
          speechFrameCount++;
          silenceFrameCount = 0;

          if (speechFrameCount >= minSpeechFrames && !isSpeech) {
            isSpeech = true;
          }
        } else {
          silenceFrameCount++;
          speechFrameCount = 0;

          if (silenceFrameCount >= silenceFrames && isSpeech) {
            isSpeech = false;
          }
        }

        // Send result back to main thread
        self.postMessage({
          status: 'result',
          probability: isSpeech ? 0.9 : 0.1 // Simplification to match the Cobra output style
        });
      } catch (error) {
        console.error('Error processing audio frame:', error);
        self.postMessage({
          status: 'error',
          error: error.message || 'Error processing audio frame'
        });
      }
      break;

    case 'terminate':
      // Cleanup resources
      if (session) {
        session = null;
      }
      self.close();
      break;

    default:
      console.warn('Unknown command:', data.command);
      break;
  }
};

// Tell the main thread we're ready to receive messages
self.postMessage({ status: 'initialized' });
