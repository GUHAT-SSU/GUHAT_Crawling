const cheerio = require("cheerio");
const axios = require("axios");
const puppeteer = require("puppeteer");
const { classSelector } = require("./crawling");

const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "electives.json");
const fileData = fs.readFileSync(filePath).toString();

const htmlPath = path.join(__dirname, "t.html");
const htmlData = fs.readFileSync(htmlPath).toString();

const prevData = JSON.parse(fileData);
let datas = new Set(); //new Set(JSON.parse(fileData));
let store = new Set();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser = null;

const years = [
    // { name: "2015", selector: "#WDC8" },
    // { name: "2016", selector: "#WDC9" },
    // { name: "2017", selector: "#WDCA" },
    // { name: "2018", selector: "#WDCB" },
    // { name: "2019", selector: "#WDCC" },
    // { name: "2020", selector: "#WDCD" },
    //{ name: "2021", selector: "#WDCE" },
    { name: "2022", selector: "#WDCF" },
];

//const semester = ["#WDDF", "#WDE0", "#WDE1", "#WDE2"]; //1학기 , 여름, 2학기, 겨울
const semester = [
    { name: "1학기", selector: "#WDDF" },
    // { name: "여름학기", selector: "#WDE0" },
    // { name: "2학기", selector: "#WDE1" },
    //{ name: "겨울학기", selector: "#WDE2" },
];

const univs = [
    { name: "사회과학대학", selector: "#WDFF" },
    { name: "경제통상대학", selector: "#WD0100" },
    { name: "경영대학", selector: "#WD0101" },
    { name: "공과대학", selector: "#WD0102" },
    { name: "IT대학", selector: "#WD0103" },
    { name: "베어드교양대학", selector: "#WD0104" },
    { name: "융합특성화자유전공학부", selector: "#WD0105" },
    { name: "차세대반도체학과", selector: "#WD0106" },
];

const usaintLogin = async (req, res) => {
    // const id = req.body.userId;
    // const pw = req.body.password;

    const id = "20201725";
    const pw = "kimhyomin667~";

    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        //usaint 로그인 페이지
        await page.goto(
            "https://smartid.ssu.ac.kr/Symtra_sso/smln.asp?apiReturnUrl=https%3A%2F%2Fsaint.ssu.ac.kr%2FwebSSO%2Fsso.jsp",
            { waitUntil: "load" }
        );

        await page.waitForSelector("#userid");
        await page.focus("#userid");
        await page.keyboard.type(id);
        await page.waitForSelector("#pwd");
        await page.focus("#pwd");
        await page.keyboard.type(pw);
        await page.click(".btn_login");
        let flag = false;
        page.on("dialog", (dialog) => {
            console.log("Dialog is up...");
            delay(1000);
            console.log("Accepted..." + dialog.message());
            //SAP NetWeaver - 로그온 준비 중입니다.
            dialog.accept();
            res.status(400).json({ message: dialog.message() });
            flag = true;
            page.close();
            return;
        });
        await page.waitForNavigation({ timeout: 10000 });
        page.close();
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
};

const electiveCrawling = async () => {
    for (let i = 0; i < prevData.length; i++) {
        store.add(prevData[i]);
    }

    browser = await puppeteer.launch({
        headless: false,
        args: [
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--no-first-run",
            "--no-sandbox",
            "--no-zygote",
            "--deterministic-fetch",
            "--disable-features=IsolateOrigins",
            "--disable-site-isolation-trials",
            // '--single-process',
        ],
    });
    await usaintLogin();
    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.goto("https://saint.ssu.ac.kr/irj/portal", {
            waitUntil: "load",
        });
        await page.waitForTimeout(1000);
        await page.waitForSelector(".mob_gnb_list");
        await page.click(".mob_gnb_list");

        await page.waitForSelector("#m_ddba4fb5fbc996006194d3c0c0aea5c4");
        await page.click("#m_ddba4fb5fbc996006194d3c0c0aea5c4");

        await page.waitForSelector("#m_12cda160608ccd7b32af0ad5c6e5752c");
        await page.click("#m_12cda160608ccd7b32af0ad5c6e5752c");

        await page.waitForSelector("#m_56883564eb5b429e9876b8176235a960"); //강의 시간표
        await page.click("#m_56883564eb5b429e9876b8176235a960");

        const frame = page.frames().find((frame) => {
            console.log(frame.name());
            return frame.name() === "contentAreaFrame";
        });

        await frame.waitForTimeout(2000);
        if (frame.name() === "contentAreaFrame") {
            const innerFrames = frame.childFrames();

            let innerFrame = null;

            for (let i = 0; i < innerFrames.length; i++) {
                const title = await innerFrames[i]
                    .title()
                    .then((t) => {
                        console.log(`result :  ` + t);
                        if (t.includes("강의시간표")) {
                            innerFrame = innerFrames[i];
                            console.log("innerFrame find!!!!");
                            return t;
                        }
                        return null;
                    })
                    .catch((e) => {
                        console.log(e);
                    });
            }
            if (innerFrame !== null) {
                await innerFrame.waitForTimeout(1000);
                try {
                    await electiveSelector(innerFrame);
                    await page.close();
                    await browser.close();
                } catch (e) {
                    console.log(e);
                    fs.writeFileSync(filePath, JSON.stringify([...store]));
                }
            }
        } else {
            console.log(frame.name());
            console.log("can not find iframe");
            await page.close();
            await browser.close();
            return false;
        }
    } catch (error) {
        console.log(error);
        await page3.close();
        await browser.close();
        return false;
    }
};

const electiveSelector = async (frame) => {
    try {
        const electiveBtn = await frame.waitForSelector("#WD010F-title");
        await electiveBtn.click();
        await frame.waitForTimeout(500);

        for (let y = 0; y < years.length; y++) {
            // await selectSchedule(page, innerFrame);
            const yearDown = await frame.waitForSelector("#WD89-btn");
            await yearDown.click();
            await frame.waitForTimeout(700);

            const yearBtn = await frame.waitForSelector(years[y].selector);
            await yearBtn.click();
            await frame.waitForTimeout(700);

            for (let s = 0; s < semester.length; s++) {
                const semesterDown = await frame.waitForSelector("#WDDD-btn");
                await semesterDown.click();
                await frame.waitForTimeout(700);

                const semesterBtn = await frame.waitForSelector(
                    semester[s].selector
                );
                await semesterBtn.click();
                await frame.waitForTimeout(700);

                const electiveDown = await frame.waitForSelector("#WD01E2-btn");
                await electiveDown.click();
                await frame.waitForTimeout(1000);

                const html = await frame
                    .content()
                    .then((html) => {
                        fs.writeFileSync(htmlPath, html);
                        console.log(
                            "---------------------save data------------"
                        );
                        return html;
                    })
                    .catch(
                        // 거부 이유 기록
                        function (reason) {
                            console.log(
                                "여기서 거부된 프로미스(" +
                                    reason +
                                    ")를 처리하세요."
                            );
                        }
                    );
                const lectures = electiveLectures(html);
                await electiveDown.click();

                for (let i = 0; i < lectures.length; i++) {
                    await frame.waitForTimeout(500);
                    const electiveDown = await frame.waitForSelector(
                        "#WD01E2-btn"
                    );
                    await electiveDown.click();
                    await frame.waitForTimeout(300);

                    const lectureBtn = await frame.waitForSelector(
                        lectures[i].selector
                    );
                    await lectureBtn.click();
                    await frame.waitForTimeout(500);

                    const search = await frame.waitForSelector("#WD0202");
                    await search.click();
                    await frame.waitForTimeout(5000);

                    const resultHtml = await frame
                        .content()
                        .then((html) => {
                            // console.log(html);
                            return html;
                        })
                        .catch(
                            // 거부 이유 기록
                            function (reason) {
                                console.log(
                                    "여기서 거부된 프로미스(" +
                                        reason +
                                        ")를 처리하세요."
                                );
                            }
                        );

                    const item = await classSelector(
                        resultHtml,
                        years[y].name,
                        semester[s].name,
                        "교양필수",
                        "",
                        ""
                    );
                    datas.add(item);
                }
                datas.forEach((e) => {
                    store.add(e);
                });
                datas.clear();
            }
        }
        fs.writeFileSync(filePath, JSON.stringify([...store]));
    } catch (error) {
        console.log(error);
        fs.writeFileSync(filePath, JSON.stringify([...store]));
    }
};

const electiveLectures = (html) => {
    const $ = cheerio.load(html);
    const table = $("#WD01E3-aria");
    let details = [];
    table.children("span").each((index, el) => {
        const m = {
            name: $(el).text(),
            selector: "#" + $(el).attr("id").split("-")[0],
        };
        details.push(m);
    });
    console.log(details);
    return details;
};

module.exports = { electiveCrawling };
