// --------------------------------------------------
// Grammar Drive 2.0 — roadside grammar challenge bank
// Short, varied activities designed for quick play breaks.
// --------------------------------------------------

const BANK = {
  "10": {
    "Question Forms": [
      { mode:"choose", prompt:"___ your brother play basketball after school?", instruction:"Choose the correct auxiliary.", options:["Do","Does","Is","Are"], answer:"Does", explanation:"Use does with he, she, or it in the present simple. The main verb stays in its base form." },
      { mode:"repair", prompt:"Find the correctly repaired sentence.", instruction:"The original sentence is: “Where she lives?”", options:["Where does she live?","Where do she live?","Where is she live?"], answer:"Where does she live?", explanation:"A present-simple Wh-question uses question word + does + subject + base verb." }
    ],
    "Yes/No Questions": [
      { mode:"choose", prompt:"Did they ___ the museum yesterday?", instruction:"Choose the base form that completes the question.", options:["visited","visit","visiting"], answer:"visit", explanation:"After did, use the base form of the verb: Did they visit…?" },
      { mode:"spot", prompt:"Which part is incorrect?", instruction:"“Does Anna likes science?”", options:["Does","Anna","likes","science"], answer:"likes", explanation:"After does, use the base verb like, not likes." }
    ],
    "Wh-Questions": [
      { mode:"choose", prompt:"Where ___ you go after school?", instruction:"Choose the correct auxiliary.", options:["do","does","are"], answer:"do", explanation:"Use do with I, you, we, and they in present-simple questions." },
      { mode:"order", prompt:"Build the question: “What time does the shop open?”", instruction:"Tap the words in the correct order.", words:["open?","What time","the shop","does"], answer:["What time","does","the shop","open?"], explanation:"A Wh-question begins with the question phrase, then auxiliary, subject, and base verb." }
    ],
    "Tag Questions": [
      { mode:"choose", prompt:"She can swim, ___?", instruction:"Choose the correct question tag.", options:["can't she","can she","doesn't she"], answer:"can't she", explanation:"A positive statement with can usually takes the negative tag can't she." },
      { mode:"repair", prompt:"Choose the correct version.", instruction:"The original sentence is: “You are ready, are you?”", options:["You are ready, aren't you?","You are ready, don't you?","You are ready, isn't it?"], answer:"You are ready, aren't you?", explanation:"A positive statement normally takes a negative tag with the same auxiliary." }
    ]
  },
  "11": {
    "Question Forms": [
      { mode:"choose", prompt:"How long ___ you been learning English?", instruction:"Choose the correct auxiliary.", options:["have","has","do"], answer:"have", explanation:"Use have with you in the present perfect: How long have you been…?" },
      { mode:"order", prompt:"Build the question: “How many books have they read?”", instruction:"Tap the words in the correct order.", words:["read?","How many","they","books","have"], answer:["How many","books","have","they","read?"], explanation:"Keep the question phrase together, then use have + subject + past participle." }
    ],
    "Yes/No Questions": [
      { mode:"repair", prompt:"Choose the correct question.", instruction:"The intended meaning is asking about life experience.", options:["Have you ever been to Chiang Mai?","Did you ever been to Chiang Mai?","Have you ever went to Chiang Mai?"], answer:"Have you ever been to Chiang Mai?", explanation:"Present-perfect questions use have/has + subject + past participle." },
      { mode:"spot", prompt:"Which word is incorrect?", instruction:"“Has they finished the assignment?”", options:["Has","they","finished","assignment"], answer:"Has", explanation:"Use have with they: Have they finished…?" }
    ],
    "Wh-Questions": [
      { mode:"choose", prompt:"Why ___ the train late yesterday?", instruction:"Choose the correct verb.", options:["was","were","did"], answer:"was", explanation:"Train is singular, so use was in the past." },
      { mode:"repair", prompt:"Choose the best correction.", instruction:"The original sentence is: “What you were doing?”", options:["What were you doing?","What did you were doing?","What was you doing?"], answer:"What were you doing?", explanation:"Past continuous questions use was/were before the subject." }
    ],
    "Tag Questions": [
      { mode:"choose", prompt:"They weren't at school, ___?", instruction:"Choose the correct tag.", options:["were they","weren't they","did they"], answer:"were they", explanation:"A negative statement normally takes a positive tag with the same auxiliary." },
      { mode:"order", prompt:"Build the tag question: “You have met her, haven't you?”", instruction:"Tap the words in the correct order.", words:["you?","You","haven't","met her,","have"], answer:["You","have","met her,","haven't","you?"], explanation:"A positive statement with have takes a negative tag: haven't you?" }
    ]
  },
  "12": {
    "Question Forms": [
      { mode:"choose", prompt:"Which proposal ___ the committee approve?", instruction:"Choose the correct auxiliary for a completed past action.", options:["did","does","has"], answer:"did", explanation:"Use did for a past-simple question; the main verb remains in its base form." },
      { mode:"repair", prompt:"Choose the grammatically correct question.", instruction:"The original sentence is: “How many applicants the company interviewed?”", options:["How many applicants did the company interview?","How many applicants does the company interviewed?","How many applicants did the company interviewed?"], answer:"How many applicants did the company interview?", explanation:"Use did + subject + base verb for a past-simple Wh-question." }
    ],
    "Yes/No Questions": [
      { mode:"choose", prompt:"Would you mind ___ the window?", instruction:"Choose the correct verb form.", options:["opening","open","to open"], answer:"opening", explanation:"Would you mind is followed by a gerund (-ing form)." },
      { mode:"spot", prompt:"Which part is incorrect?", instruction:"“Did the manager approved the request?”", options:["Did","manager","approved","request"], answer:"approved", explanation:"After did, use the base verb approve." }
    ],
    "Wh-Questions": [
      { mode:"repair", prompt:"Choose the correct passive question.", instruction:"The original sentence is: “How often does the report updated?”", options:["How often is the report updated?","How often the report is updated?","How often does the report updates?"], answer:"How often is the report updated?", explanation:"Present-simple passive questions use is/are before the subject + past participle." },
      { mode:"order", prompt:"Build the question: “Why has the schedule changed?”", instruction:"Tap the words in the correct order.", words:["changed?","Why","the schedule","has"], answer:["Why","has","the schedule","changed?"], explanation:"Present-perfect Wh-questions use question word + has/have + subject + past participle." }
    ],
    "Tag Questions": [
      { mode:"choose", prompt:"Let's review the final draft, ___?", instruction:"Choose the conventional tag.", options:["shall we","will we","do we"], answer:"shall we", explanation:"The conventional question tag after Let's is shall we?" },
      { mode:"repair", prompt:"Choose the correct tag question.", instruction:"The original sentence is: “Nobody called, didn't they?”", options:["Nobody called, did they?","Nobody called, didn't nobody?","Nobody called, do they?"], answer:"Nobody called, did they?", explanation:"Nobody is negative in meaning, so the tag is positive. They is commonly used with nobody." }
    ]
  }
};

export function createGrammarChallenge(grade, topics) {
  const bank = BANK[String(grade)] || BANK["10"];
  const available = (Array.isArray(topics) ? topics : Object.values(topics || {}))
    .flatMap((topic) => (bank[topic] || []).map((item) => ({ ...item, topic })));
  if (!available.length) return null;

  const selected = available[Math.floor(Math.random() * available.length)];
  if (selected.mode === "order") {
    const words = selected.words.slice();
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return { ...selected, words, selectedWords: [], selectedWordIndexes: [] };
  }
  return { ...selected, selectedOption: null };
}
