import express from "express";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/app", express.static(path.join(__dirname, "../public")));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
