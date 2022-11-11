const fs = require("fs");
const path = require("path");

const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const axios = require("axios");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const { crawling } = require("./crawling");
const { electiveCrawling } = require("./elective");
const { test } = require("./readingTest");

const PORT = 5001;
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("port", process.env.PORT || PORT);

electiveCrawling();
//crawling();
//test();

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.listen(app.get("port"), () => {
    console.log(`Server listening on port ${app.get("port")}...`);
});
