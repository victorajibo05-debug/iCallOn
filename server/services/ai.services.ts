import path from "path";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({ path: path.join(process.cwd(), "server", ".env") });

const apiKey = process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

const MODEL = "llama-3.3-70b-versatile";

export interface AIVerdict {
  valid: boolean;
  reason: string;
}

export interface GradedFields {
  name: AIVerdict;
  animal: AIVerdict;
  place: AIVerdict;
  thing: AIVerdict;
}

export interface PlayerAnswerInput {
  playerId: string;
  name: string;
  animal: string;
  place: string;
  thing: string;
}

const FIELDS = ["name", "animal", "place", "thing"] as const;

const SYSTEM_PROMPT = `You are the strict but fair referee for a Nigerian word game called "Call On" (also known as "Name, Place, Animal, Thing").

For each player's four answers, decide if EACH field is VALID. A field is valid only if ALL of these hold:
1. It is not blank.
2. It genuinely starts with the round's called letter (case-insensitive).
3. It is a real, recognizable entry for that category — a real name, a real place, a real animal, or a real object/thing.
4. It is not gibberish, a random keyboard mash, or just the category word itself.

Prioritize Nigerian context: accept Nigerian first/last names (Yoruba, Igbo, Hausa, and other Nigerian ethnic groups — e.g. "Chidinma", "Folake", "Aminu"), Nigerian cities/towns/states/villages (e.g. "Ikorodu", "Nsukka", "Owerri"), Nigerian Pidgin English words, and locally common slang, even if a generic English dictionary wouldn't contain them.

Give a short reason (max 6 words) for each verdict.

You MUST respond with ONLY a single JSON object, no other text, matching exactly this shape:
{
  "results": [
    {
      "playerId": "string, copied exactly from the input",
      "name": { "valid": true or false, "reason": "short string" },
      "animal": { "valid": true or false, "reason": "short string" },
      "place": { "valid": true or false, "reason": "short string" },
      "thing": { "valid": true or false, "reason": "short string" }
    }
  ]
}
Include one entry in "results" for every player given, using their exact playerId. Do not add extra keys or commentary.`;

function buildUserPrompt(letter: string, players: PlayerAnswerInput[]): string {
  const entries = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    animal: p.animal,
    place: p.place,
    thing: p.thing,
  }));

  return `Called letter: "${letter.toUpperCase()}"

Player answers (JSON array):
${JSON.stringify(entries, null, 2)}`;
}

export async function gradeRound(
  letter: string,
  players: PlayerAnswerInput[]
): Promise<Record<string, GradedFields>> {
  if (players.length === 0) return {};

  if (!groq) {
    console.warn("[ai.service] GROQ_API_KEY not set — falling back to letter-only grading");
    return fallbackGrade(letter, players);
  }

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(letter, players) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq");

    const parsed = JSON.parse(text);
    const graded = validateAndExtract(parsed, players);
    if (!graded) throw new Error("Groq response did not match expected shape");

    for (const p of players) {
      if (!graded[p.playerId]) {
        graded[p.playerId] = fallbackGrade(letter, [p])[p.playerId];
      }
    }

    return graded;
  } catch (err) {
    console.error("[ai.service] Groq grading failed, falling back to letter-only grading:", err);
    return fallbackGrade(letter, players);
  }
}

// Groq's json_object mode guarantees valid JSON but NOT a specific shape, so every field
// is manually checked before being trusted. Anything malformed triggers the full fallback.
function validateAndExtract(
  parsed: unknown,
  players: PlayerAnswerInput[]
): Record<string, GradedFields> | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const results = (parsed as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;

  const knownIds = new Set(players.map((p) => p.playerId));
  const graded: Record<string, GradedFields> = {};

  for (const entry of results) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const playerId = e.playerId;
    if (typeof playerId !== "string" || !knownIds.has(playerId)) continue;

    const fields: Partial<GradedFields> = {};
    let allFieldsValid = true;

    for (const field of FIELDS) {
      const v = e[field];
      if (
        typeof v === "object" &&
        v !== null &&
        typeof (v as any).valid === "boolean" &&
        typeof (v as any).reason === "string"
      ) {
        fields[field] = { valid: (v as any).valid, reason: (v as any).reason.slice(0, 80) };
      } else {
        allFieldsValid = false;
        break;
      }
    }

    if (allFieldsValid) {
      graded[playerId] = fields as GradedFields;
    }
  }

  return Object.keys(graded).length > 0 ? graded : null;
}

// Fallback if the key is missing, the call fails, or the shape can't be trusted.
// Letter-check only — keeps the game playable during an AI outage.
function fallbackGrade(letter: string, players: PlayerAnswerInput[]): Record<string, GradedFields> {
  const grade = (val: string): AIVerdict => {
    const trimmed = (val || "").trim();
    if (trimmed === "") return { valid: false, reason: "Blank answer" };
    const ok = trimmed.toLowerCase().startsWith(letter.toLowerCase());
    return { valid: ok, reason: ok ? "Starts with letter (AI unavailable)" : "Wrong starting letter" };
  };

  const graded: Record<string, GradedFields> = {};
  for (const p of players) {
    graded[p.playerId] = {
      name: grade(p.name),
      animal: grade(p.animal),
      place: grade(p.place),
      thing: grade(p.thing),
    };
  }
  return graded;
}