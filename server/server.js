const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ FIX: was "./utils/formatter.js" — file is at root
const { processInput } = require("./utils/formatter.js");

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

app.post("/format", async (req, res) => {
  // ✅ FIX: frontend sends { input }, not { text }
  const text = (req.body.input || req.body.text || "").trim();

  if (!text) {
    return res.json({ suggestions: [] });
  }

  if (text.length < 2) {
    return res.status(400).json({ error: "Too short input" });
  }

  if (text.length > 2000) {
    return res.status(400).json({ error: "Text too long" });
  }

  try {
    const completion = await client.chat.completions.create(
      {
        model: "deepseek/deepseek-chat",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a smart note formatting AI.

Convert the user's raw input into 2-4 structured format suggestions.

Return ONLY valid JSON — no markdown fences, no explanation, no text before or after.

Schema:
{
  "suggestions": [
    {
      "type": "todo | note | task | calculation | code | list",
      "icon": "<single emoji>",
      "title": "<concise label, max 6 words>",
      "content": "<cleaned text if not a todo/list>",
      "todos": [{ "text": "<item>", "done": false }]
    }
  ]
}

Rules:
- Always return the "suggestions" array with at least one item
- For todo/task inputs, populate "todos" array; leave "content" empty
- For code, set type to "code" and put code in "content"
- For calculations, show the result in "content"
- Fix spelling and grammar silently
- Group related items (same context, same day, same category) into ONE suggestion as a list or todo
- Only create multiple suggestions when intents are genuinely different (e.g. a todo AND a code snippet)
- Never split a single list into separate suggestions
- Output MUST be parseable by JSON.parse() with no pre-processing
`
          },
          {
            role: "user",
            content: text
          }
        ]
      },
      {
        headers: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Nota App"
        }
      }
    );

    let aiResponse = (completion?.choices?.[0]?.message?.content || "").trim();

    // Strip accidental markdown fences
    aiResponse = aiResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
    } catch {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("No valid JSON in AI response");
      }
    }

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      throw new Error("Invalid or empty suggestions array");
    }

    console.log(`✅ AI returned ${parsed.suggestions.length} suggestion(s)`);
    return res.json(parsed);

  } catch (err) {
    console.error("⚠️  AI failed, using formatter fallback:", err.message);
    return res.json(processInput(text));
  }
});

app.listen(5000, () => {
  console.log("✅ Server running at http://localhost:5000");
});