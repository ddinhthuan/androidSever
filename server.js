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
              text: "Tôi là một người mù và cần biết có những gì trong bức ảnh tôi vừa chụp. Vui lòng tuân thủ các quy tắc sau, không cần giải thích thêm ngoài nội dung tôi yêu cầu: (1)Nếu ảnh có cảnh vật hoặc phong cảnh, hãy mô tả khung cảnh đó trong khoảng 15 từ, không thừa ý.(2)Nếu ảnh có người hoặc nhiều vật thể, hãy mô tả hoặc liệt kê những người/vật thể chính, mỗi người/vật thể không quá 10 từ, không thừa ý.(3)Nếu ảnh có chữ viết (dù là chữ in hay viết tay), hãy sao chép đầy đủ và chính xác phần chữ đó, không giới hạn số từ và không sửa lỗi chính tả.(4) Nếu ảnh là ảnh chụp người/chân dung, thì tôi cần một vài đặc điểm về khuôn mặt và giới tính, ước lượng độ tuổi(khoảng 20 từ).(5)Không trả lời gì khác ngoài những điều tôi yêu cầu ở trên.(6)Toàn bộ câu trả lời bằng tiếng Việt.(7)chỉ sử dụng kí tự viết thường, viết hoa và dấu câu chấm phẩy, không xuống dòng"
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
