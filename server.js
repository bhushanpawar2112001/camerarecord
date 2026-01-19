require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
app.use(express.static("public"));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".webm");
  }
});

const upload = multer({ storage });

app.post("/upload", upload.single("video"), async (req, res) => {
  const webmPath = req.file.path;
  const mp4Path = webmPath.replace(".webm", ".mp4");

  try {
    // 🔄 Convert webm → mp4
    await new Promise((resolve, reject) => {
      ffmpeg(webmPath)
        .outputOptions([
          "-movflags faststart",
          "-pix_fmt yuv420p",
          "-vcodec libx264",
          "-acodec aac"
        ])
        .save(mp4Path)
        .on("end", resolve)
        .on("error", reject);
    });

    // 📤 Send MP4 to Telegram
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("video", fs.createReadStream(mp4Path));
    formData.append("supports_streaming", "true");

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(webmPath);
    fs.unlinkSync(mp4Path);

    res.send("MP4 video sent & plays inline ▶️");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Failed");
  }
});

app.listen(3000, () => console.log("Server running on 3000"));
