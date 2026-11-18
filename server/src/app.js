const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const instagramRoutes = require("./routes/instagram.routes");
const youtubeRoutes = require("./routes/youtube.routes");
const errorMiddleware = require("./middleware/error.middleware");
const legalRoutes = require("./routes/legal.routes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/instagram", instagramRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/", legalRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Instagram YouTube Portal API is running",
  });
});

app.use(errorMiddleware);

module.exports = app;
