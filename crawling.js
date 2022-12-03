const cheerio = require("cheerio");
const e = require("cors");
const puppeteer = require("puppeteer");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser = null;

const years = [
    { name: "2022", selector: "#WD67" },
    //{ name: "2021", selector: "#WD66" },
    //{ name: "2020", selector: "#WD66" },
    // { name: "2019", selector: "#WD64" },
    // { name: "2018", selector: "#WD63" },
];

const semesters = [
    // { name: "1학기", selector: "#WD77" },
    // { name: "여름학기", selector: "#WD78" },
    { name: "2학기", selector: "#WD79" },
    //{ name: "겨울학기", selector: "#WD7A" },
];

const initBrowser = async () => {
    return (browser = await puppeteer.launch({
        headless: true,
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
    }));
};

const killBrowser = async (browser) => {
    try {
        if (browser && browser.process() != null) {
            console.log("start kill browser");
            let pages = await browser.pages();
            for (const page of pages) {
                await page.close();
            }
            await browser.close();
        }
    } catch (e) {
        console.log(e);
    }
};
const usaintLogin = async (id, pw) => {
    let browser = await initBrowser();
    let msg = null;
    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        await page.setRequestInterception(true);

        page.on("request", (req) => {
            switch (req.resourceType()) {
                case "stylesheet":
                case "font":
                case "image":
                    req.abort();
                    break;
                default:
                    req.continue();
                    break;
            }
        });

        //usaint 로그인 페이지
        await page.goto(
            "https://smartid.ssu.ac.kr/Symtra_sso/smln.asp?apiReturnUrl=https%3A%2F%2Fsaint.ssu.ac.kr%2FwebSSO%2Fsso.jsp",
            { waitUntil: "load" }
        );

        let loginCheck = true;

        page.once("dialog", (dialog) => {
            loginCheck = false;
            console.log("Dialog is up...");
            msg = dialog.message();
            console.log("Accepted..." + msg);
            //SAP NetWeaver - 로그온 준비 중입니다.
            dialog.accept();
        });

        await page.waitForSelector("#userid");
        await page.focus("#userid");
        await page.keyboard.type(id);
        await page.waitForSelector("#pwd");
        await page.focus("#pwd");
        await page.keyboard.type(pw);
        await page.waitForSelector(".btn_login");

        let loginResult;
        let scheduleResult;

        // await Promise.all([
        //     page.waitForNavigation(), // The promise resolves after navigation has finished
        //     page.click(".btn_login"), // Clicking the link will indirectly cause a navigation
        // ]);

        await page.click(".btn_login");
        await page.waitForTimeout(1000);
        console.log(loginCheck);
        if (!msg && loginCheck) {
            loginResult = await getProfile(browser);
        }

        if (!loginCheck || (loginResult && !loginResult.ok)) {
            killBrowser(browser);
            return {
                ok: false,
                message: msg
                    ? msg
                    : loginResult
                    ? loginResult.message
                    : "cant not find error cause...",
            };
        } else {
            killBrowser(browser);
            return {
                ok: true,
                message: "usaint login success",
                data: { ...loginResult.data },
            };
        }
    } catch (e) {
        console.log(e);
        killBrowser(browser);
        return { ok: false, message: msg ? msg : e.mesage };
    }
};

const getProfile = async (browserArg) => {
    let browser;
    if (!browserArg) {
        browser = await initBrowser();
    } else {
        browser = browserArg;
        console.log("profile brower is alive");
    }
    try {
        const entrancePage = await browser.newPage();
        //  await page2.setDefaultNavigationTimeout(0);
        await entrancePage.setRequestInterception(true);

        entrancePage.on("request", (req) => {
            switch (req.resourceType()) {
                case "stylesheet":
                case "font":

                default:
                    req.continue();
                    break;
            }
        });

        // /* 학적 정보 페이지 이동 */
        await entrancePage.goto(
            "https://ecc.ssu.ac.kr/sap/bc/webdynpro/SAP/ZCMW1001n?sap-language=KO#",
            { waitUntil: "load" }
        );

        await entrancePage.waitForNavigation();
        let errorPage = false;
        entrancePage.frames().forEach((frame) => {
            frame.title().then((t) => {
                if (t.includes("로그온")) {
                    console.log("로그온?" + t);
                    errorPage = true;
                }
            });
        });

        if (errorPage)
            return {
                ok: false,
                message: "Usaint 서버 오류, 재로그인 해주세요",
            };

        let pageRes = true;
        await entrancePage
            .waitForSelector("#WD8E", { timeout: 3000 })
            .then(() => {
                return true;
            })
            .catch((e) => {
                console.log("페이지 오류" + e.message);
                pageRes = false;
            });
        if (!pageRes) return { ok: false, message: "잘못된 페이지 접근" };

        const entranceYear = await entrancePage.evaluate(
            () => document.querySelector("#WD8E").value
        );
        await entrancePage.waitForSelector("#WD97");
        const studentID = await entrancePage.evaluate(
            () => document.querySelector("#WD97").value
        );
        await entrancePage.waitForSelector("#WDA0");
        const name = await entrancePage.evaluate(() =>
            document.querySelector("#WDA0").value.replace(" ", "")
        );
        await entrancePage.waitForSelector("#WDB8");
        const grade = await entrancePage.evaluate(() =>
            document.querySelector("#WDB8").value.replace(" ", "")
        );
        await entrancePage.waitForSelector("#WD92");
        const univ = await entrancePage.evaluate(
            () => document.querySelector("#WD92").value
        ); //단과대
        await entrancePage.waitForSelector("#WD9B");
        const major = await entrancePage.evaluate(
            () => document.querySelector("#WD9B").value
        ); //학과
        await entrancePage.waitForSelector("#WDAD");
        const group = await entrancePage.evaluate(
            () => document.querySelector("#WDAD").value
        ); //분반
        await entrancePage.waitForSelector("#WDBC");
        const semester = await entrancePage.evaluate(() =>
            document.querySelector("#WDBC").value.replace(" ", "")
        ); //학기
        await entrancePage.close();
        // 정보
        const entrance = {
            name: name,
            entranceYear: entranceYear,
            studentId: studentID,
            grade: grade,
            univ: univ,
            major: major,
            group: group,
            semester: semester,
        };

        return {
            ok: true,
            data: entrance,
            message: "[Succes] usaint parsing ",
        };
    } catch (error) {
        console.log(error);
        killBrowser(browser);
        return { ok: false, message: "[Fail] usaint parsing error" };
    }
};

const loadSchedule = async (id, pw) => {
    let browser = await initBrowser();
    let msg = null;

    try {
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        await page.setRequestInterception(true);

        page.on("request", (req) => {
            switch (req.resourceType()) {
                case "stylesheet":
                case "font":
                case "image":
                    req.abort();
                    break;
                default:
                    req.continue();
                    break;
            }
        });

        //usaint 로그인 페이지
        await page.goto(
            "https://smartid.ssu.ac.kr/Symtra_sso/smln.asp?apiReturnUrl=https%3A%2F%2Fsaint.ssu.ac.kr%2FwebSSO%2Fsso.jsp",
            { waitUntil: "load" }
        );

        let loginCheck = true;

        page.once("dialog", (dialog) => {
            loginCheck = false;
            console.log("Dialog is up...");
            msg = dialog.message();
            console.log("Accepted..." + msg);
            //SAP NetWeaver - 로그온 준비 중입니다.
            dialog.accept();
        });

        await page.waitForSelector("#userid");
        await page.focus("#userid");
        await page.keyboard.type(id);
        await page.waitForSelector("#pwd");
        await page.focus("#pwd");
        await page.keyboard.type(pw);
        await page.waitForSelector(".btn_login");

        await page.click(".btn_login");
        await page.waitForTimeout(1000);
        console.log(loginCheck);
        let schedule;
        if (loginCheck) {
            schedule = await getSchedule(browser);
        } else {
            return {
                ok: false,
                message: msg ? msg : "fail to login usaint",
            };
        }
        killBrowser(browser);
        if (schedule && schedule.ok) {
            return {
                ok: true,
                message: "[success] load schedule",
                data: [...schedule.data],
            };
        } else {
            return {
                ok: false,
                message: "[fail] load schedule",
            };
        }
    } catch (error) {
        killBrowser(browser);
        console.log(error);
        return {
            ok: false,
            message: e.message ? e.message : "[fail] load schedule",
        };
    }
};

const getSchedule = async (browserArg) => {
    let browser;
    if (!browserArg) {
        browser = await initBrowser();
    } else {
        browser = browserArg;
        console.log(" schedule brower is alive");
    }
    const schedulePage = await browser.newPage();
    try {
        await schedulePage.setRequestInterception(true);

        schedulePage.on("request", (req) => {
            switch (req.resourceType()) {
                case "stylesheet":
                case "font":
                default:
                    req.continue();
                    break;
            }
        });

        await schedulePage.setDefaultNavigationTimeout(0);
        await schedulePage.goto("https://saint.ssu.ac.kr/irj/portal", {
            waitUntil: "load",
        });
        await schedulePage.waitForTimeout(1000);
        await schedulePage.waitForSelector(".mob_gnb_list");
        await schedulePage.click(".mob_gnb_list");

        await schedulePage.waitForSelector(
            "#m_ddba4fb5fbc996006194d3c0c0aea5c4"
        );
        await schedulePage.click("#m_ddba4fb5fbc996006194d3c0c0aea5c4");

        await schedulePage.waitForSelector(
            "#m_12cda160608ccd7b32af0ad5c6e5752c"
        );
        await schedulePage.click("#m_12cda160608ccd7b32af0ad5c6e5752c");

        await schedulePage.waitForSelector(
            "#m_1724938fdd5d98311a8647b31efd21fe"
        );
        await schedulePage.click("#m_1724938fdd5d98311a8647b31efd21fe");

        const frame = schedulePage.frames().find((frame) => {
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
                        if (t.includes("수업시간표조회")) {
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
                await innerFrame.waitForTimeout(2000);
                try {
                    const result = await selectSchedule(
                        schedulePage,
                        innerFrame
                    );

                    return {
                        ok: true,
                        data: result,
                        message: "[Success] schedule parsing",
                    };
                } catch (e) {
                    console.log(e);
                    //killBrowser(browser);
                    return {
                        ok: false,
                        message: "[Fail] schedule parsing error",
                    };
                }
            }
        } else {
            await schedulePage.close();
            return { ok: false, message: "[Fail] schedule parsing error" };
        }
    } catch (error) {
        console.log(error);
        // killBrowser(browser);
        await schedulePage.close();
        return { ok: false, message: "[Fail] schedule parsing error" };
    }
};

const selectSchedule = async (page, frame) => {
    const schedules = [];

    try {
        for (let y = 0; y < years.length; y++) {
            const yearDown = await frame.waitForSelector(`#WD21-btn`);
            await yearDown.click();
            // await page.waitForTimeout(200);

            const yearBtn = await frame.waitForSelector(years[y].selector);
            await yearBtn.click();
            //await page.waitForTimeout(200);

            for (let s = 0; s < semesters.length; s++) {
                const semesterDown = await frame.waitForSelector("#WD75-btn");
                await semesterDown.click();

                await page.waitForTimeout(200);

                const semesterBtn = await frame.waitForSelector(
                    semesters[s].selector
                );
                await semesterBtn.click();
                await page.waitForTimeout(700);

                const html = await frame
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
                let schedule = {
                    year: "",
                    semester: "",
                    data: [],
                };

                const result = await scheduleParser(html);

                schedule.year = years[y].name;
                schedule.semester = semesters[s].name;
                schedule.data = result.isEmpty ? [] : result.schedule;

                schedules.push(schedule);
            }
        }
        return schedules;
    } catch (e) {
        console.log(e);
    }
};

// id="WD60" => 2015
// id="WD61" => 2016
// id="WD62" => 2017
// id="WD63" => 2018
// id="WD64" => 2019
// id="WD65" => 2020
// id="WD66" => 2021
// id="WD67" => 2022
// id="WD77" => 1학기
// id="WD78" => 여름학기
// id="WD79" => 2학기
// id="WD7A" => 겨울학기

const scheduleParser = async (html) => {
    const $ = cheerio.load(html);
    const table = $("#WD8C-contentTBody");

    var schedule = Array.from(Array(10), () => Array(6).fill(null));
    let isEmpty = true;

    $("#WD8C-contentTBody")
        .children("tr")
        .each((index, el) => {
            if (index < 11) {
                const tds = $(el).children("td");
                tds.each((idx, td) => {
                    if (idx !== 0 && !$(td).text().includes("비어 있음")) {
                        isEmpty = false;
                        let item = $(td)
                            .children("span")
                            .children("span:nth-child(2)")
                            .text()
                            .split("\n");

                        let lecture = {
                            name: "",
                            professor: "",
                            time: "",
                            place: "",
                        };
                        if (item.length > 3) {
                            lecture.name = item[0];
                            lecture.professor = item[1];
                            lecture.time = item[2];
                            lecture.place = item[3];

                            schedule[index - 1][idx - 1] = lecture;
                        } else {
                            schedule[index - 1][idx - 1] = $(td)
                                .text()
                                .includes("비어 있음")
                                ? null
                                : $(td).text();
                        }
                    } else if (idx !== 0)
                        schedule[index - 1][idx - 1] = $(td)
                            .text()
                            .includes("비어 있음")
                            ? null
                            : $(td).text();
                });
            }
        });

    const result = [];

    for (let i = 0; i < schedule[0].length; i++) {
        const tmp = [];
        schedule.forEach((row, idx) => tmp.push(row[i]));
        result.push(tmp);
    }
    return { schedule: result, isEmpty: isEmpty };
};

module.exports = {
    usaintLogin,
    getProfile,
    getSchedule,
    selectSchedule,
    loadSchedule,
};
