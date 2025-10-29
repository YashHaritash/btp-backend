const express = require("express");
const router = express.Router();

const Code = require("../models/Code");
const Session = require("../models/Session");

const loginRequired = require("../middleware/loginRequired");

//create a code
router.post("/create", loginRequired, async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const newCode = new Code({ sessionId, code });
    await newCode.save();
    res.send(newCode);
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});
//get all code by a session
router.get("/getCode/:sessionId", loginRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const code = await Code.findOne({ sessionId });
    res.send(code);
  } catch {
    return res.status(500).send("Internal server error");
  }
});

// Update code with version history
router.put("/update/:sessionId", loginRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code } = req.body;

    let currentCode = await Code.findOne({ sessionId });

    if (!currentCode) {
      currentCode = new Code({ sessionId, code, versionHistory: [] });
    } else {
      currentCode.versionHistory.push({
        code: currentCode.code,
        updatedAt: Date.now(),
      });
      currentCode.code = code;
      currentCode.updatedAt = Date.now();
    }

    await currentCode.save();
    res.send(currentCode);
  } catch (err) {
    console.error("Error updating code:", err);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
