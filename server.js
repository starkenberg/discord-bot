require("dotenv").config();

const express = require("express");
const http = require("http");
const client = require("./bot");
const createWSServer = require("./ws");

const app = express();
const server = http.createServer(app);

// Static files (widget)
app.use(express.static("public"));
