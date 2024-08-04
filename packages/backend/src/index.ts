import express from "express";
import path from "path";
import transcriptionEndpoint from "./transcriptionEndpoint";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "audio/wav", limit: "10mb" }));
app.use("/app", express.static(path.join(__dirname, "../public")));

app.use((req, _, next) => {
  console.log("Received request:", req.method, req.url);
  next();
});

app.use("/api", transcriptionEndpoint);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
