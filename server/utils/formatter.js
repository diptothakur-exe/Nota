function processInput(input) {
    if (!input || input.trim() === "") {
      return { suggestions: [] };
    }
  
    let cleaned = normalizeText(input);
    let segments = splitMixedContent(cleaned);
  
    let suggestions = segments.map(segment => {
      let type = detectType(segment);
      let priority = detectPriority(segment);
      return formatSuggestion(segment, type, priority);
    });
  
    return { suggestions };
  }
  
  // ---------- NORMALIZATION ----------
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/\btmrw\b/g, "tomorrow")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  // ---------- SPLIT ----------
  function splitMixedContent(text) {
    return text.split(/[.!?]+/).map(t => t.trim()).filter(Boolean);
  }
  
  // ---------- TYPE ----------
  function detectType(text) {
    if (/[\d+\-*/]/.test(text)) return "calculation";
    if (text.includes("fix") || text.includes("bug")) return "code";
    if (text.includes("buy") || text.includes("call")) return "todo";
    if (text.includes(",")) return "list";
    return "note";
  }
  
  // ---------- PRIORITY ----------
  function detectPriority(text) {
    if (/urgent|asap|now|today|!!!/.test(text)) return "high";
    if (/tomorrow|soon|important/.test(text)) return "medium";
    return "low";
  }
  
  // ---------- FORMAT ----------
  function formatSuggestion(text, type, priority) {
    let suggestion = {
      type,
      icon: getIcon(type),
      title: generateTitle(text),
      content: capitalize(text),
      priority
    };
  
    if (type === "todo" || type === "list") {
      suggestion.todos = extractTodos(text);
    }
  
    return suggestion;
  }
  
  // ---------- HELPERS ----------
  function extractTodos(text) {
    const items = text.split(/,|\n|and/).map(i => i.trim()).filter(Boolean);
  
    return items.map(item => ({
      text: capitalize(item),
      done: false
    }));
  }
  
  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  function generateTitle(text) {
    return capitalize(text.split(" ").slice(0, 4).join(" "));
  }
  
  function getIcon(type) {
    const map = {
      todo: "✅",
      task: "📌",
      note: "📝",
      calculation: "🧮",
      code: "💻",
      list: "📋"
    };
    return map[type] || "📝";
  }
  
  module.exports = { processInput };