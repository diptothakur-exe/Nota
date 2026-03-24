import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 AI ROUTE
app.post("/format", async (req, res) => {
  const { input } = req.body;

  if (!input || input.length > 2000) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are a smart AI formatter.

Convert messy input into structured outputs.

Return ONLY JSON:
{
  "suggestions": [
    {
      "type": "todo|note|task|calculation|code|list",
      "icon": "emoji",
      "title": "short label",
      "content": "text",
      "todos": [{"text": "item", "done": false}]
    }
  ]
}

Rules:
- Fix spelling
- Detect intent
- Multiple suggestions if needed
- No explanation
          `,
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    let text = completion.choices[0].message.content;

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = {
        suggestions: [
          {
            type: "note",
            icon: "📝",
            title: "Clean Note",
            content: input,
          },
        ],
      };
    }

    res.json(parsed);

  } catch (err) {
    console.error("AI ERROR:", err.message);
    res.status(500).json({
      suggestions: [
        {
          type: "note",
          icon: "📝",
          title: "Fallback",
          content: input,
        },
      ],
    });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});