const fs = require("fs");
const path = require("path");

const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const axios = require("axios");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const crawlingRouter = require("./crawlingRoute");

const PORT = 8080;
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("port", process.env.PORT || PORT);
app.use("/crawling", crawlingRouter);

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.listen(app.get("port"), () => {
    console.log(`Server listening on port ${app.get("port")}...`);
});
