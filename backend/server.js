import express from "express";
import dotenv from "dotenv";
import connectDB from "../backend/config/db.config.js";
import routes from "../backend/routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;


app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("API Cafecito Feliz con MongoDB");
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method, // GET / POST / PUT ...
    url: req.originalUrl, // http://localhost:3000/...
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
