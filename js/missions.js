// --------------------------------------------------
// Grammar Drive — Phase 5B mission gameplay
// A driving-and-discovery mission, not a multiple-choice quiz.
// --------------------------------------------------

const STOPS = [
  { x: 1725, y: 800 },
  { x: 900, y: 2220 },
  { x: 2580, y: 800 },
  { x: 3220, y: 1225 },
  { x: 300, y: 2220 },
  { x: 1725, y: 2220 },
  { x: 2580, y: 230 },
  { x: 900, y: 230 }
];

const MISSION_BANK = {
  "10": {
    "Question Forms": [
      { title: "The Missing Message", briefing: "A delivery drone scattered a question across the city. Recover every message crate, return to Dispatch, and rebuild the question.", fragments: ["Where", "do", "you", "live?"], explanation: "A Wh-question uses the question word first, followed by the auxiliary, subject, and base verb." }
    ],
    "Yes/No Questions": [
      { title: "The Radio Check", briefing: "The city radio has lost its transmission script. Find the scattered message parts and rebuild the Yes/No question at Dispatch.", fragments: ["Do", "you", "play", "football?"], explanation: "A present-simple Yes/No question uses Do + subject + base verb." }
    ],
    "Wh-Questions": [
      { title: "The Lost Destination", briefing: "A courier forgot the destination question. Search the marked roads for the missing message crates, then rebuild the question.", fragments: ["Where", "does", "she", "work?"], explanation: "Where asks about a place. With she, use does followed by the base verb." }
    ],
    "Tag Questions": [
      { title: "The Confirmation Run", briefing: "The control tower needs a confirmation message. Recover its parts and assemble the correct question tag.", fragments: ["You are ready,", "aren't", "you?"], explanation: "A positive statement normally takes a negative question tag with the same auxiliary." }
    ]
  },
  "11": {
    "Question Forms": [
      { title: "The Missing Message", briefing: "A delivery drone scattered a question across the city. Recover every message crate, return to Dispatch, and rebuild the question.", fragments: ["How long", "have", "you", "studied English?"], explanation: "Present-perfect questions use have or has before the subject, followed by the past participle." }
    ],
    "Yes/No Questions": [
      { title: "The Radio Check", briefing: "The city radio has lost its transmission script. Find the scattered message parts and rebuild the Yes/No question at Dispatch.", fragments: ["Have", "you", "finished", "your homework?"], explanation: "A present-perfect Yes/No question begins with Have or Has, followed by the subject and past participle." }
    ],
    "Wh-Questions": [
      { title: "The Lost Destination", briefing: "A courier forgot the destination question. Search the marked roads for the missing message crates, then rebuild the question.", fragments: ["How long", "have", "you", "lived here?"], explanation: "How long asks about duration. In the present perfect, have comes before the subject." }
    ],
    "Tag Questions": [
      { title: "The Confirmation Run", briefing: "The control tower needs a confirmation message. Recover its parts and assemble the correct question tag.", fragments: ["They have finished,", "haven't", "they?"], explanation: "A positive present-perfect statement takes a negative tag using have." }
    ]
  },
  "12": {
    "Question Forms": [
      { title: "The Missing Message", briefing: "A delivery drone scattered a formal question across the city. Recover every message crate, return to Dispatch, and rebuild the message.", fragments: ["Could you tell me", "where", "the station", "is?"], explanation: "An embedded question uses statement word order after the question word: where the station is." }
    ],
    "Yes/No Questions": [
      { title: "The Radio Check", briefing: "The city radio has lost its polite request. Find the scattered message parts and rebuild the sentence at Dispatch.", fragments: ["Would you mind", "opening", "the window?"], explanation: "Would you mind is followed by a gerund (the -ing form)." }
    ],
    "Wh-Questions": [
      { title: "The Lost Destination", briefing: "A courier forgot the reason for a cancelled route. Search the marked roads and rebuild the missing question.", fragments: ["Why", "was", "the proposal", "rejected?"], explanation: "Why asks for a reason. In a passive question, the auxiliary was comes before the subject." }
    ],
    "Tag Questions": [
      { title: "The Confirmation Run", briefing: "The control tower needs a confirmation message. Recover its parts and assemble the correct question tag.", fragments: ["Let's review the answers,", "shall", "we?"], explanation: "The conventional question tag after Let's is shall we?" }
    ]
  }
};

function normaliseTopics(topics) {
  return Array.isArray(topics) ? topics : Object.values(topics || {});
}

export function createMission({ grade, topics }) {
  const bank = MISSION_BANK[String(grade)] || MISSION_BANK["10"];
  const available = normaliseTopics(topics).flatMap((topic) =>
    (bank[topic] || []).map((mission) => ({ ...mission, topic }))
  );
  if (!available.length) return null;

  const selected = available[Math.floor(Math.random() * available.length)];
  const fragments = selected.fragments.map((text, id) => ({ id, text }));
  const shuffled = fragments.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    id: selected.topic + "-" + Date.now().toString(36),
    topic: selected.topic,
    title: selected.title,
    briefing: selected.briefing,
    explanation: selected.explanation,
    fragments,
    shuffled,
    stops: STOPS.slice(0, fragments.length),
    collected: [],
    assembled: [],
    status: "available"
  };
}

export function nearbyMissionCrate(x, y, mission, radius = 105) {
  if (!mission || mission.status !== "collecting") return null;
  let closest = null;
  let best = radius * radius;
  mission.stops.forEach((stop, index) => {
    if (mission.collected.includes(index)) return;
    const dx = x - stop.x;
    const dy = y - stop.y;
    const distance = dx * dx + dy * dy;
    if (distance <= best) {
      best = distance;
      closest = { ...stop, index, name: "Message Crate " + (index + 1) };
    }
  });
  return closest;
}

export function drawMissionMarkers(ctx, project, mission) {
  if (!mission || !["collecting", "return"].includes(mission.status)) return;
  mission.stops.forEach((stop, index) => {
    if (mission.collected.includes(index)) return;
    const p = project(stop.x, stop.y);
    const scale = p.scale;
    const size = Math.max(11, 18 * scale);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(250,204,21,.16)";
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(-size * .72, -size * .58, size * 1.44, size * 1.16);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-size * .72, -size * .58, size * 1.44, size * .22);
    ctx.fillRect(-size * .12, -size * .58, size * .24, size * 1.16);
    ctx.strokeStyle = "#ffedd5";
    ctx.lineWidth = Math.max(1, scale * 2);
    ctx.strokeRect(-size * .72, -size * .58, size * 1.44, size * 1.16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold " + Math.max(8, size * .8) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), 0, 1);
    ctx.restore();
  });
}
