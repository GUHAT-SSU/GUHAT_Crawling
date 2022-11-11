const cheerio = require("cheerio");
const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "lectures.json");
const fileData = fs.readFileSync(filePath).toString();
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
    { name: "2021", selector: "#WDCE" },
    // { name: "2022", selector: "#WDCF" },
];

//const semester = ["#WDDF", "#WDE0", "#WDE1", "#WDE2"]; //1학기 , 여름, 2학기, 겨울
const semester = [
    // { name: "1학기", selector: "#WDDF" },
    //{ name: "여름학기", selector: "#WDE0" },
    // { name: "2학기", selector: "#WDE1" },
    { name: "겨울학기", selector: "#WDE2" },
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

const crawling = async () => {
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
                    await yearSelector(innerFrame);
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

//년도->학기 -> 단과대 -> 학과 parsing -> 과목 parsing
const yearSelector = async (innerFrame) => {
    for (let i = 0; i < years.length; i++) {
        // await selectSchedule(page, innerFrame);
        const yearDown = await innerFrame.waitForSelector("#WD89-btn");
        await yearDown.click();
        await innerFrame.waitForTimeout(700);

        const yearBtn = await innerFrame.waitForSelector(years[i].selector);
        await yearBtn.click();
        await innerFrame.waitForTimeout(700);

        for (let s = 0; s < semester.length; s++) {
            const semesterDown = await innerFrame.waitForSelector("#WDDD-btn");
            await semesterDown.click();
            await innerFrame.waitForTimeout(700);

            const semesterBtn = await innerFrame.waitForSelector(
                semester[s].selector
            );
            await semesterBtn.click();
            await innerFrame.waitForTimeout(700);

            //major parsing

            for (let u = 0; u < univs.length; u++) {
                const univDown = await innerFrame.waitForSelector("#WDFA-btn");
                await univDown.click();
                await innerFrame.waitForTimeout(700);

                const univBtn = await innerFrame.waitForSelector(
                    univs[u].selector
                );
                await univBtn.click();
                await innerFrame.waitForTimeout(500);

                const majorDown = await innerFrame.waitForSelector(
                    "#WD0108-btn"
                );
                await majorDown.click();

                const html = await innerFrame
                    .content()
                    .then((html) => {
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
                const majors = await majorSelector(html);

                await innerFrame.waitForTimeout(500);
                await majorDown.click();

                for (let m = 0; m < majors.length; m++) {
                    const majorDown = await innerFrame.waitForSelector(
                        "#WD0108-btn"
                    );
                    await majorDown.click();
                    await innerFrame.waitForTimeout(700);

                    const majorBtn = await innerFrame.waitForSelector(
                        majors[m].selector
                    );
                    await majorBtn.click();
                    await innerFrame.waitForTimeout(500);

                    const groupDown = await innerFrame.waitForSelector(
                        "#WD010B-btn"
                    );
                    await groupDown.click();
                    await innerFrame.waitForTimeout(1000);

                    const groupHtml = await innerFrame
                        .content()
                        .then((html) => {
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

                    const groups = await detailSelector(groupHtml);
                    await groupDown.click();

                    for (let g = 0; g < groups.length; g++) {
                        await innerFrame.waitForTimeout(500);
                        const groupDown = await innerFrame.waitForSelector(
                            "#WD010B-btn"
                        );
                        await groupDown.click();

                        await innerFrame.waitForTimeout(200);
                        const groupBtn = await innerFrame.waitForSelector(
                            groups[g].selector
                        );
                        await groupBtn.click();
                        await innerFrame.waitForTimeout(500);

                        const search = await innerFrame.waitForSelector(
                            "#WD010E"
                        );
                        await search.click();
                        await innerFrame.waitForTimeout(5000);

                        const result = await innerFrame
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
                        await classSelector(
                            result,
                            years[i].name,
                            semester[s].name,
                            univs[u].name,
                            majors[m].name,
                            groups[g].name
                        );
                    }
                }
                datas.forEach((e) => {
                    store.add(e);
                });
                datas.clear();
                fs.writeFileSync(filePath, JSON.stringify([...store]));
            }
        }
    }
};

const detailSelector = async (html) => {
    const $ = cheerio.load(html);
    const table = $("#WD010C-aria");
    let details = [];
    table.children("span").each((index, el) => {
        const m = {
            name: $(el).text(),
            selector: "#" + $(el).attr("id").split("-")[0],
        };
        details.push(m);
    });
    return details;
};

const majorSelector = async (html) => {
    const $ = cheerio.load(html);
    const table = $("#WD0109-aria");

    let majors = [];

    table.children("span").each((index, el) => {
        const m = {
            name: $(el).text(),
            selector: "#" + $(el).attr("id").split("-")[0],
        };
        majors.push(m);
    });
    return majors;
};

const classSelector = async (html, year, semester, univ, major, detail) => {
    const $ = cheerio.load(html);
    const td = $("#WD0181-contentTBody");

    let classes = [];

    td.children("tr").each((index, el) => {
        const classItem = {
            id: "",
            year: "",
            semester: "",
            univ: "",
            major: "",
            major_detail: "",
            name: "",
            group: "",
            professor: "",
            schedule: "",
            target: "", //수강대상
        };
        const input = [];
        {
            $(el)
                .children("td")
                .each((i, tr) => {
                    if (i === 5) {
                        const id = $(tr)
                            .children("a")
                            .children("span:nth-child(2)")
                            .text();
                        input.push(id);
                    } else if (i === 6) {
                        const name = $(tr)
                            .children("span")
                            .children("span:nth-child(1)")
                            .text();
                        input.push(name);
                    } else if (i === 8) {
                        const professor = $(tr)
                            .children("span")
                            .children("span")
                            .text();
                        if (professor.includes("\n")) {
                            let professors = [
                                ...new Set(
                                    professor
                                        .split("\n")
                                        .slice(1, professor.length - 1)
                                ),
                            ];
                            input.push(professors);
                        } else if (!professor.includes("비어 있음")) {
                            const p = professor.slice(0, professor.length / 2);
                            input.push([p]);
                        } else {
                            input.push("");
                        }
                    } else if (i == 13) {
                        const times = [];

                        let lectures = [];
                        let time = $(tr)
                            .children("span")
                            .children("span:nth-child(1)")
                            .text();
                        while (time.indexOf(")") !== -1) {
                            const seperator = time.indexOf(")");
                            const detailChecker = time.indexOf("(", seperator);
                            if (seperator === time.length - 1) {
                                //수업이 하나인 경우
                                times.push(time);
                                break;
                            } else {
                                if (detailChecker !== -1) {
                                    //수업이 더 있음
                                    times.push(time.slice(0, seperator + 1));
                                    time = time.substring(seperator + 1);
                                } else {
                                    console.log(time);
                                    times.push(time);
                                    break;
                                }
                            }
                        }
                        times.map((item, idx) => {
                            const lecture = {
                                day: "",
                                time: "",
                                place: "",
                            };
                            const info = item
                                .slice(0, item.indexOf("("))
                                .split(" ");

                            lecture.place = item.substring(item.indexOf("(")); // 마지막 요소
                            lecture.time = info[info.length - 2];
                            lecture.day = info.slice(0, info.length - 2);
                            lectures.push(lecture);
                        });

                        input.push(lectures);
                    } else if (i == 14) {
                        //수강 대상
                        const target = $(tr)
                            .children("span")
                            .children("span:nth-child(1)")
                            .text();
                        input.push(target.split([";", ","]));
                    } else input.push($(tr).text());
                });
        }

        if (input[5] !== undefined) {
            classItem.year = year;
            classItem.semester = semester;
            classItem.univ = univ;
            classItem.major = major;
            classItem.major_detail = detail;
            classItem.id = input[5];
            classItem.name = input[6];
            classItem.group = input[7].includes("비어 있음") ? "" : input[7];

            classItem.professor = input[8];
            classItem.schedule = input[13].includes("비어 있음")
                ? ""
                : input[13];
            classItem.target = input[14].includes("비어 있음") ? "" : input[14];
            classes.push(classItem);
        }
    });
    datas.add(classes);
    console.log(classes);
    return classes;
};

module.exports = { crawling, usaintLogin, classSelector };
