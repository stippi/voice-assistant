import express from "express";
import path from "path";
import { WhisperTranscriber } from "./whisperTranscriber";
import { AudioChunkRequest } from "./types";

const router = express.Router();
const transcriber = new WhisperTranscriber(path.join(__dirname, "../../../../ggml-large-v3.bin"));

router.post("/transcribe", async (req, res) => {
  try {
    if (!req.body || !(req.body instanceof Buffer)) {
      throw new Error("Invalid request body");
    }

    const audioBuffer = new Float32Array(req.body.buffer);

    const audioChunkRequest: AudioChunkRequest = {
      audioChunk: audioBuffer,
      isFirst: req.query.isFirst === "true",
      isLast: req.query.isLast === "true",
      language: req.query.language as string | undefined,
    };

    const transcription = await transcriber.processChunk(audioChunkRequest);

    res.json({ transcription });
  } catch (error) {
    console.error("Error during transcription:", error);
    res.status(500).json({ error: "An error occurred during transcription" });
  }
});

export default router;
