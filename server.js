// server.js (rút gọn)
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const mqtt = require("mqtt");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

// Tạo client GPT-4O
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Kết nối MQTT
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: "mqtts",
  port: 8883,
  rejectUnauthorized: false
});

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker!");
});

app.post("/upload", async (req, res) => {
  const base64Image = req.body.image; // Android gửi key "image"

  if (!base64Image) {
    return res.status(400).json({ message: "No image found" });
  }

  try {
    // Gọi GPT-4O Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hãy mô tả những gì bạn thấy qua các keywords (chỉ keyword), trả lời trên một dòng, định dạng bình thường không in đậm, không xuống dòng, trả lời bằng tiếng việt nhé!"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const description = response.choices[0].message.content;
    console.log("Description from GPT-4O Vision:", description);

    // Publish MQTT
    mqttClient.publish("kltn/test", description, { qos: 1 }, (err) => {
      if (err) console.error("Error publishing to MQTT:", err);
    });

    res.json({ description });
  } catch (err) {
    console.error("Error analyzing image:", err);
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
