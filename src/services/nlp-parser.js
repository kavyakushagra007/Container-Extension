// ── SaveIt: Offline Natural Language & Temporal Query Parser ──
// Parses conversational questions like:
// "two days ago, I have seen a black Nike shoes. Can you tell me which one was that"
// into: { cleanKeywords: ["black", "nike", "shoes"], timeRange: { start, end, label: "2 days ago" }, isConversational: true }
// 100% offline, zero-latency, private.

const NLPParser = (() => {
  const NUMBER_WORDS = {
    one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, couple: 2, few: 3,
  };

  const CONVERSATIONAL_PATTERNS = [
    /can you (please )?tell me (which|what|where) (one )?was that/gi,
    /can you (please )?(find|show|tell) (me )?/gi,
    /do you (remember|know) (which|what) /gi,
    /which (one )?was that/gi,
    /what was (that|the)/gi,
    /where (did i|was that|was the)/gi,
    /i (have )?(seen|watched|viewed|checked|read|looked at|visited) (a |an |the )?/gi,
    /i was (looking at|looking for|searching for|reading) (a |an |the )?/gi,
    /suppose i (see|saw)/gi,
    /show me/gi,
    /find me/gi,
    /tell me/gi,
  ];

  const STOP_WORDS = new Set([
    "a", "about", "an", "and", "are", "as", "at", "be", "by", "can", "could",
    "did", "do", "for", "from", "had", "has", "have", "he", "her", "here",
    "him", "his", "how", "i", "if", "in", "is", "it", "its", "me", "my",
    "of", "on", "or", "our", "please", "she", "so", "some", "suppose", "tell",
    "that", "the", "their", "them", "then", "there", "these", "they", "this",
    "to", "was", "we", "were", "what", "when", "where", "which", "who", "will",
    "with", "would", "you", "your", "one", "ones", "seen", "saw"
  ]);

  function parseQuery(rawQuery) {
    if (!rawQuery || typeof rawQuery !== "string") {
      return { rawQuery: "", cleanKeywords: [], timeRange: null, isConversational: false, promptText: "" };
    }

    const trimmed = rawQuery.trim();
    let working = " " + trimmed.toLowerCase() + " ";
    let isConversational = false;
    let timeRange = null;

    // 1. Detect and extract temporal expressions
    const now = new Date();
    const dayStart = (offset = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime();
    const ONE_HOUR = 60 * 60 * 1000;
    const number = value => NUMBER_WORDS[value] ?? Number(value);
    const dayMatch = working.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few|\d+)\s+days?\s+ago\b/i);
    const hourMatch = working.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few|\d+)\s+hours?\s+ago\b/i);
    let expression = null;
    if (dayMatch) {
      const count = number(dayMatch[1]);
      timeRange = { start: dayStart(-count), end: dayStart(1 - count) - 1, label: `${count} days ago` };
      expression = dayMatch[0];
    } else if (/\byesterday\b/i.test(working)) {
      timeRange = { start: dayStart(-1), end: dayStart() - 1, label: "yesterday" };
      expression = /\byesterday\b/gi;
    } else if (/\b(today|this morning|this afternoon|tonight)\b/i.test(working)) {
      const match = working.match(/\b(today|this morning|this afternoon|tonight)\b/i)[0];
      const hour = match === "this afternoon" ? 12 : match === "tonight" ? 18 : 0;
      const endHour = match === "this morning" ? 12 : match === "this afternoon" ? 18 : 24;
      timeRange = {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).getTime(),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour).getTime() - 1,
        label: match,
      };
      expression = match;
    } else if (hourMatch) {
      const count = number(hourMatch[1]);
      timeRange = { start: now.getTime() - (count + 0.5) * ONE_HOUR, end: Math.min(now.getTime(), now.getTime() - (count - 0.5) * ONE_HOUR), label: `${count} hours ago` };
      expression = hourMatch[0];
    } else if (/\blast week\b/i.test(working)) {
      const daysSinceMonday = (now.getDay() + 6) % 7;
      timeRange = { start: dayStart(-daysSinceMonday - 7), end: dayStart(-daysSinceMonday) - 1, label: "last week" };
      expression = /\blast week\b/gi;
    } else if (/\b(a|one) week ago\b/i.test(working)) {
      timeRange = { start: dayStart(-7), end: dayStart(-6) - 1, label: "a week ago" };
      expression = /\b(a|one) week ago\b/gi;
    }
    if (expression) {
      isConversational = true;
      working = working.replace(expression, " ");
    }

    // 2. Strip conversational phrases
    CONVERSATIONAL_PATTERNS.forEach((pattern) => {
      pattern.lastIndex = 0;
      if (pattern.test(working)) {
        isConversational = true;
        pattern.lastIndex = 0;
        working = working.replace(pattern, " ");
      }
    });

    // 3. Clean punctuation & extract keywords
    const cleaned = working
      .replace(/[?!,.:;"'()\[\]{}—–-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned.split(" ").filter((w) => w.length > 1);
    const cleanKeywords = words.filter((w) => !STOP_WORDS.has(w));

    // If query has question mark or longer natural prose, mark conversational
    if (trimmed.includes("?") || trimmed.split(" ").length >= 6) {
      isConversational = true;
    }

    return {
      rawQuery: trimmed,
      cleanKeywords,
      timeRange,
      isConversational,
      promptText: cleanKeywords.join(" "),
    };
  }

  return {
    parseQuery,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = NLPParser;
}

