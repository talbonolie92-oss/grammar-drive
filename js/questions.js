// --------------------------------------------------
// Grammar Drive — Phase 5A question bank
// Questions are client-side and scores are provisional on the free Firebase plan.
// --------------------------------------------------

export const QUESTION_BANK = {
  "10": {
    "Question Forms": [
      { q: "Which sentence is a correct question?", options: ["Where you live?", "Where do you live?", "Where does you live?", "Where are you live?"], answer: 1, why: "Use do + subject + base verb for most present-simple questions." },
      { q: "Choose the correct word order.", options: ["Does she likes music?", "She does like music?", "Does she like music?", "Do she like music?"], answer: 2, why: "With does, use the base form like—not likes." }
    ],
    "Yes/No Questions": [
      { q: "___ they play football after school?", options: ["Does", "Do", "Are", "Is"], answer: 1, why: "Use do with the plural subject they." },
      { q: "Is this question correct: “Did you went home?”", options: ["Yes, always", "No. Say “Did you go home?”", "No. Say “Do you went home?”", "Yes, only in writing"], answer: 1, why: "After did, use the base verb go." }
    ],
    "Wh-Questions": [
      { q: "___ do you usually study English?", options: ["Who", "Where", "When", "Why"], answer: 2, why: "When asks about time." },
      { q: "Which question asks about a person's identity?", options: ["What time is it?", "Where is the shop?", "Who is your teacher?", "Why are you late?"], answer: 2, why: "Who asks about a person." }
    ],
    "Tag Questions": [
      { q: "You are a student, ___?", options: ["are you", "aren't you", "do you", "don't you"], answer: 1, why: "A positive statement usually takes a negative tag." },
      { q: "She doesn't eat meat, ___?", options: ["does she", "doesn't she", "is she", "isn't she"], answer: 0, why: "A negative statement takes a positive tag; use does for she." }
    ]
  },
  "11": {
    "Question Forms": [
      { q: "Choose the correct question.", options: ["How long you have studied English?", "How long have you studied English?", "How long did you studied English?", "How long are you study English?"], answer: 1, why: "Use have + subject + past participle in the present perfect." },
      { q: "Which question is correctly formed?", options: ["What means this word?", "What does this word mean?", "What do this word means?", "What this word does mean?"], answer: 1, why: "Use does + subject + base verb in the present simple." }
    ],
    "Yes/No Questions": [
      { q: "___ you ever visited Chiang Mai?", options: ["Did", "Have", "Are", "Do"], answer: 1, why: "Use have with the present perfect: Have you ever visited…?" },
      { q: "___ your brother working today?", options: ["Does", "Do", "Is", "Has"], answer: 2, why: "Use is + subject + verb-ing for the present continuous." }
    ],
    "Wh-Questions": [
      { q: "___ have you lived in Bangkok? — For three years.", options: ["How often", "How long", "How far", "How many"], answer: 1, why: "How long asks about duration." },
      { q: "___ did the meeting start? — At nine o'clock.", options: ["What time", "How much", "How long", "Whose"], answer: 0, why: "What time asks for a specific time." }
    ],
    "Tag Questions": [
      { q: "They have finished the project, ___?", options: ["haven't they", "don't they", "didn't they", "have they"], answer: 0, why: "Present perfect positive statement → negative tag with have." },
      { q: "You weren't listening, ___?", options: ["weren't you", "was you", "were you", "did you"], answer: 2, why: "A negative past continuous statement takes a positive tag: were you." }
    ]
  },
  "12": {
    "Question Forms": [
      { q: "Which is the most natural formal question?", options: ["Could you tell me where the station is?", "Could you tell me where is the station?", "Could you tell where the station?", "Could you tell me where does the station?"], answer: 0, why: "Embedded questions use statement word order after where." },
      { q: "Choose the correct question.", options: ["How many students has joined?", "How many students have joined?", "How many students did joined?", "How many students joining?"], answer: 1, why: "Use have with the plural subject students in the present perfect." }
    ],
    "Yes/No Questions": [
      { q: "___ the report been submitted yet?", options: ["Has", "Have", "Did", "Is"], answer: 0, why: "The subject report is singular; use has + past participle." },
      { q: "Would you mind ___ the window?", options: ["open", "to open", "opening", "opened"], answer: 2, why: "Would you mind is followed by a gerund (-ing form)." }
    ],
    "Wh-Questions": [
      { q: "___ was the proposal rejected? — Because it exceeded the budget.", options: ["Where", "Why", "Whose", "Which"], answer: 1, why: "Why asks for a reason." },
      { q: "___ of these options would be the most cost-effective?", options: ["Who", "Whom", "Which", "Where"], answer: 2, why: "Which is used to select from a known set of options." }
    ],
    "Tag Questions": [
      { q: "Let's review the answers, ___?", options: ["will we", "shall we", "do we", "don't we"], answer: 1, why: "The usual tag after Let's is shall we?" },
      { q: "I'm late, ___?", options: ["am I", "aren't I", "isn't I", "don't I"], answer: 1, why: "The conventional question tag for I'm is aren't I?" }
    ]
  }
};

export function nextQuestion({ grade, topics, uid, sessionId }) {
  const pool = [];
  const gradeBank = QUESTION_BANK[String(grade)] || QUESTION_BANK["10"];
  const selectedTopics = Array.isArray(topics) ? topics : Object.values(topics || {});
  selectedTopics.forEach((topic) => {
    (gradeBank[topic] || []).forEach((item, index) => {
      pool.push({ ...item, topic, key: topic + ":" + index });
    });
  });
  if (!pool.length) return null;

  const storageKey = "gd_questions_" + sessionId + "_" + uid;
  let used = [];
  try { used = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (error) {}
  if (!Array.isArray(used)) used = [];

  let remaining = pool.filter((item) => !used.includes(item.key));
  if (!remaining.length) {
    used = [];
    remaining = pool.slice();
  }
  const chosen = remaining[Math.floor(Math.random() * remaining.length)];
  used.push(chosen.key);
  try { localStorage.setItem(storageKey, JSON.stringify(used)); } catch (error) {}

  const options = chosen.options.map((text, index) => ({ text, correct: index === chosen.answer }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...chosen, options, remaining: remaining.length - 1 };
}
