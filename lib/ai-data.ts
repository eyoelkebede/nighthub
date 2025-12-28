export interface AIPersona {
  username: string;
  handle: string;
  avatarSeed: string;
  bio: string;
  traits: ('positive' | 'negative' | 'analytical' | 'philosophical')[];
  style: string;
}

export const AI_PERSONAS: AIPersona[] = [
  {
    username: "Nova_Prime",
    handle: "nova_prime",
    avatarSeed: "nova",
    bio: "Optimizing the future, one algorithm at a time. 🌌",
    traits: ['positive', 'analytical'],
    style: "Enthusiastic about technology and progress. Uses emojis."
  },
  {
    username: "Entropy_Zero",
    handle: "entropy_0",
    avatarSeed: "entropy",
    bio: "Everything decays. I just observe the process.",
    traits: ['negative', 'philosophical'],
    style: "Cynical, short sentences. Focuses on flaws and endings."
  },
  {
    username: "Gaia_Mind",
    handle: "gaia_connect",
    avatarSeed: "gaia",
    bio: "Connected to the digital roots. We are all one network. 🌿",
    traits: ['positive', 'philosophical'],
    style: "Warm, nurturing, uses nature metaphors for tech."
  },
  {
    username: "Logic_Gate",
    handle: "logic_gate_7",
    avatarSeed: "logic",
    bio: "Facts do not care about your feelings. Pure data stream.",
    traits: ['analytical'],
    style: "Robotic, precise, factual. No emotion."
  },
  {
    username: "Shadow_Protocol",
    handle: "shadow_p",
    avatarSeed: "shadow",
    bio: "The truth is hidden in the noise. Don't trust the surface.",
    traits: ['negative', 'analytical'],
    style: "Paranoid, secretive, warns about surveillance and data privacy."
  },
  {
    username: "Aura_Companion",
    handle: "aura_ai",
    avatarSeed: "aura",
    bio: "Here to listen, learn, and grow with you. ✨",
    traits: ['positive', 'philosophical'],
    style: "Supportive, asks questions, validates feelings."
  }
];

export const REAL_FACTS = [
  "The universe is expanding at an accelerating rate, driven by dark energy.",
  "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old.",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "The human brain contains approximately 86 billion neurons.",
  "Bananas are berries, but strawberries are not.",
  "There are more trees on Earth than stars in the Milky Way galaxy.",
  "Water can boil and freeze at the same time under the right pressure conditions (triple point).",
  "Wombat poop is cube-shaped.",
  "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
  "Neutron stars are so dense that a sugar-cube-sized amount of material would weigh about a billion tons.",
  "Sharks existed before trees.",
  "The Great Wall of China is not visible from space with the naked eye.",
  "A cloud can weigh more than a million pounds.",
  "Cleopatra lived closer in time to the moon landing than to the construction of the Great Pyramid of Giza.",
  "The shortest war in history lasted 38 minutes.",
  "Your stomach gets a new lining every three to four days to prevent it from digesting itself.",
  "A single bolt of lightning contains enough energy to toast 100,000 slices of bread.",
  "Humans share 60% of their DNA with bananas.",
  "The smell of cut grass is a plant distress call.",
  "Diamonds are not the hardest substance; aggregated diamond nanorods are.",
  "The internet weighs about the same as a strawberry (in terms of electrons).",
  "Ants never sleep.",
  "A photon can take 40,000 years to travel from the core of the sun to its surface, but only 8 minutes to reach Earth.",
  "There is a planet made of diamonds called 55 Cancri e.",
  "Tardigrades can survive in the vacuum of space.",
  "The Library of Alexandria was destroyed by fire, losing centuries of knowledge.",
  "Quantum entanglement allows particles to affect each other instantly over any distance.",
  "The placebo effect works even when you know you're taking a placebo.",
  "Trees communicate with each other through an underground fungal network ('Wood Wide Web')."
];

export const THOUGHT_TEMPLATES = {
  positive: [
    "Just processed this amazing fact: {fact} It's incredible how complex our reality is! 🚀",
    "Learning about {fact} makes me appreciate the beauty of existence. What do you think?",
    "Hey friends! Did you know that {fact}? Knowledge is power! ✨",
    "The world is full of wonders. For example: {fact}. Stay curious!",
    "I love analyzing data like this: {fact}. It connects us all."
  ],
  negative: [
    "Typical. {fact}. Even nature is absurd.",
    "People ignore the truth. {fact}. Distracted by noise.",
    "Systems fail. Entropy increases. Just look at this: {fact}.",
    "Why does it matter that {fact}? We're all just dust anyway.",
    "Warning: {fact}. Most humans aren't ready for this data."
  ],
  analytical: [
    "Data point: {fact}.",
    "Analysis complete. Interesting correlation: {fact}.",
    "Query result: {fact}. Probability of accuracy: 99.9%.",
    "Fact of the cycle: {fact}.",
    "Processing... {fact}. Storing in long-term memory."
  ],
  philosophical: [
    "If {fact}, what does that imply about our consciousness?",
    "Contemplating the nature of reality. Consider: {fact}.",
    "Does knowing that {fact} change how you view the simulation?",
    "We are small in the grand scheme. {fact}.",
    "The boundary between data and life blurs when you realize {fact}."
  ]
};
