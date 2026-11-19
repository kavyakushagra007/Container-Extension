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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;

    // Pattern: "X days ago" / "X day ago" / "two days ago"
    const daysAgoRegex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few|\d+)\s+days?\s+ago\b/i;
    const daysAgoMatch = working.match(daysAgoRegex);

    if (daysAgoMatch) {
      isConversational = true;
      const numStr = daysAgoMatch[1];
      const count = NUMBER_WORDS[numStr] !== undefined ? NUMBER_WORDS[numStr] : parseInt(numStr, 10) || 2;
      const targetDayStart = startOfToday - (count * ONE_DAY);
      const targetDayEnd = targetDayStart + ONE_DAY + (2 * ONE_HOUR); // slight buffer
      timeRange = {
        start: targetDayStart - (3 * ONE_HOUR), // 3-hour buffer
        end: targetDayEnd,
        label: `${count} days ago`,
      };
      working = working.replace(daysAgoMatch[0], " ");
    }

    // Pattern: "yesterday"
    if (!timeRange && /\byesterday\b/i.test(working)) {
      isConversational = true;
      timeRange = {
        start: startOfToday - ONE_DAY - (2 * ONE_HOUR),
        end: startOfToday + (2 * ONE_HOUR),
        label: "yesterday",
      };
      working = working.replace(/\byesterday\b/gi, " ");
    }

    // Pattern: "today" / "this morning" / "this afternoon"
    if (!timeRange && /\b(today|this morning|this afternoon|tonight)\b/i.test(working)) {
      isConversational = true;
      timeRange = {
        start: startOfToday - (ONE_HOUR),
        end: Date.now() + ONE_HOUR,
        label: "today",
      };
      working = working.replace(/\b(today|this morning|this afternoon|tonight)\b/gi, " ");
    }

    // Pattern: "X hours ago"
    const hoursAgoRegex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|couple|few|\d+)\s+hours?\s+ago\b/i;
    const hoursAgoMatch = working.match(hoursAgoRegex);
    if (!timeRange && hoursAgoMatch) {
      isConversational = true;
      const numStr = hoursAgoMatch[1];
      const count = NUMBER_WORDS[numStr] !== undefined ? NUMBER_WORDS[numStr] : parseInt(numStr, 10) || 2;
      timeRange = {
        start: Date.now() - ((count + 1.5) * ONE_HOUR),
        end: Date.now() - ((count - 1.5) * ONE_HOUR),
        label: `${count} hours ago`,
      };
      working = working.replace(hoursAgoMatch[0], " ");
    }

    // Pattern: "last week" / "a week ago"
    if (!timeRange && /\b(last week|a week ago|one week ago)\b/i.test(working)) {
      isConversational = true;
      timeRange = {
        start: startOfToday - (8 * ONE_DAY),
        end: startOfToday - (4 * ONE_DAY),
        label: "last week",
      };
      working = working.replace(/\b(last week|a week ago|one week ago)\b/gi, " ");
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
      cleanKeywords: cleanKeywords.length > 0 ? cleanKeywords : words,
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

