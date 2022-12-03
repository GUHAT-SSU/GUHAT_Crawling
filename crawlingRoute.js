require("dotenv").config();
const express = require("express");
const controller = require("./crawlingController");
const router = express.Router();

router.post("/", controller.getProfileData);
router.post("/schedule", controller.getScheduleData);
module.exports = router;
