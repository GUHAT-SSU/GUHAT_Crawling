const { usaintLogin, loadSchedule } = require("./crawling");

module.exports = {
    getProfileData: async (req, res) => {
        try {
            const id = req.body.userId;
            const pw = req.body.password;

            const result = await usaintLogin(id, pw);
            console.log(result?.data);
            if (result.ok) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (e) {
            console.log(e);
            res.status(500).json({ message: error });
        }
    },

    getScheduleData: async (req, res) => {
        try {
            const id = req.body.userId;
            const pw = req.body.password;

            const result = await loadSchedule(id, pw);
            console.log(result?.data);
            if (result.ok) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (e) {
            console.log(e);
            res.status(500).json({ message: error });
        }
    },
};
