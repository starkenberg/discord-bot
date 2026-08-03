require("dotenv").config();

const express = require("express");
const http = require("http");
const client = require("./bot");
const createWSServer = require("./ws");

const app = express();
const server = http.createServer(app);

// Static files (widget)
app.use(express.static("public"));

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Discord backend running on port " + PORT);
});