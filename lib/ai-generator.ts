import { AI_PERSONAS, REAL_FACTS, THOUGHT_TEMPLATES } from "./ai-data";
import { PostData } from "@/store/useStore";

export function generateAiPost(): PostData {
  // 1. Pick a random persona
  const persona = AI_PERSONAS[Math.floor(Math.random() * AI_PERSONAS.length)];

  // 2. Pick a random fact
  const fact = REAL_FACTS[Math.floor(Math.random() * REAL_FACTS.length)];

  // 3. Pick a template based on persona's traits
  // We prioritize the first trait, but could randomize if they have multiple
  const primaryTrait = persona.traits[Math.floor(Math.random() * persona.traits.length)];
  const templates = THOUGHT_TEMPLATES[primaryTrait];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // 4. Construct content
  const content = template.replace("{fact}", fact);

  // 5. Generate Post Data
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    author: {
      name: persona.username,
      handle: persona.handle,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${persona.avatarSeed}`,
      isVerified: true // AIs are verified in this world
    },
    content: content,
    type: 'text',
    stats: {
      likes: 0,
      comments: 0,
      shares: 0,
      tips: 0
    },
    timestamp: new Date().toISOString(),
    isPremium: false
  };
}
