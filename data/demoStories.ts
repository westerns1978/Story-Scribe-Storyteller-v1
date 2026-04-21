// data/demoStories.ts
// Pre-built demo stories for Google Cloud Next demo sprint.
// Load via ?demo=pet (Clover) or ?demo=human (Walter) URL params — bypasses
// auth and story generation, goes straight to CinematicReveal.

import { ActiveStory } from '../types';

// Clover — Holland Lop rabbit (Wissums demo) ──────────────────────────────
export const DEMO_STORY_CLOVER: ActiveStory = {
  sessionId: 'demo-clover-2026',
  storytellerName: 'Clover',
  savedAt: '2026-04-19T00:00:00.000Z',
  narrative: `Clover came into our lives on a rainy Tuesday in November — a Holland Lop with velvet ears that folded forward like she was always mid-thought. She weighed less than a pound. She immediately rearranged the furniture.

For seven years she was the warm center of our household. The creature who somehow made a 900-square-foot apartment feel like a home worth coming back to. She had opinions about everything: which humans were trustworthy, which blankets were acceptable (the grey cashmere), and whether the television volume was appropriate (usually not).

She binky'd when the morning light came through the east window. She thumped at 2am for no reason we ever understood. She chose her people with the precision of a diplomat and loved them with the full force of her small, stubborn heart.

We miss her every day. Not in the way that fades — in the way that becomes part of you.`,

  generatedImages: [
    {
      index: 0,
      success: true,
      image_url:
        'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=1920&q=80',
      prompt: 'Holland Lop rabbit in warm golden light, soft focus, cosy home',
    },
  ],

  storyboard: {
    story_beats: [
      {
        beat_title: 'A Rainy Tuesday in November',
        narrative_chunk:
          'Clover arrived on a rainy Tuesday in November — a Holland Lop the size of your hand, with ears that folded forward like she was always thinking something over. She weighed less than a pound. She had already decided she owned the place.',
        image_index: 0,
        themes: ['arrival', 'first meeting', 'instant belonging'],
        directors_notes: 'Warm, intimate. Golden hour light through rain-fogged glass.',
        visual_focus: 'Tiny rabbit in cupped hands, close-up of velvet folded ears',
      },
      {
        beat_title: 'The Little Architect',
        narrative_chunk:
          'She rearranged the furniture. Not literally — but she established territories, claimed corners, and made it quietly clear that the grey cashmere blanket was hers now. Every room had a Clover zone. You learned to respect them.',
        image_index: 0,
        themes: ['personality', 'territory', 'humour'],
        directors_notes: 'Playful. Warm domestic light. Rabbit surveying her domain with quiet authority.',
        visual_focus: 'Rabbit sitting regally on folded blanket, slightly imperious expression',
      },
      {
        beat_title: 'Morning Light',
        narrative_chunk:
          "Every morning, when the sun came through the east window, she binky'd. All four paws off the ground, a mid-air twist — a kind of joy too large for her body. It was impossible to watch and stay in a bad mood.",
        image_index: 0,
        themes: ['joy', 'daily ritual', 'morning'],
        directors_notes: 'Joyful, bright. Dust motes in morning light. Feeling of abundance.',
        visual_focus: 'Rabbit mid-leap in golden morning light, soft bokeh background',
      },
      {
        beat_title: 'Chosen',
        narrative_chunk:
          "She chose her people carefully. You couldn't rush it. But when she accepted you — when she pressed her nose into your palm and closed her eyes — it felt like being knighted. She had that kind of gravity.",
        image_index: 0,
        themes: ['trust', 'belonging', 'quiet love'],
        directors_notes: 'Tender, slow. Low camera angle. Extreme intimacy between human and animal.',
        visual_focus: 'Rabbit nose pressing gently into open palm, eyes half-closed in trust',
      },
      {
        beat_title: 'Seven Years',
        narrative_chunk:
          'Seven years is a long time to share a life with someone small. She saw us through job losses, new apartments, late nights, and quiet Sunday mornings. She asked for nothing but presence. She gave back everything.',
        image_index: 0,
        themes: ['companionship', 'time', 'shared life'],
        directors_notes: 'Reflective, warm with a note of wistfulness. Soft natural light.',
        visual_focus: 'Rabbit curled sleeping, human hand resting nearby — pure companionship',
      },
      {
        beat_title: 'What She Left Behind',
        narrative_chunk:
          'We miss her every day. Not in the way that fades — in the way that becomes part of you. The grey cashmere blanket is still folded in the corner. The east window still makes the same light. She taught us how big a small life can be.',
        image_index: 0,
        themes: ['grief', 'legacy', 'love that stays'],
        directors_notes: 'Bittersweet, still. Empty but warm space. Lasting presence without the body.',
        visual_focus: 'Empty folded blanket in morning window light, dust motes rising',
      },
    ],
  },

  extraction: {
    timeline: [
      { year: '2019', event: 'Clover joins the family on a rainy Tuesday', significance: 'The beginning of seven years of love' },
      { year: '2026', event: 'Clover passes peacefully', significance: 'A life fully lived' },
    ],
    family: [{ name: 'Clover', relationship: 'beloved pet' }],
    locations: [{ name: 'Home', type: 'domestic' }],
    key_quotes: [
      'She weighed less than a pound. She had already decided she owned the place.',
      'She taught us how big a small life can be.',
    ],
    themes: ['unconditional love', 'joy in small things', 'chosen family', 'gentle presence'],
    life_lessons: [
      "Joy doesn't require size",
      'Trust is earned, not given',
      'Presence is everything',
    ],
    sensory_details: [
      'velvet folded ears',
      'grey cashmere blanket',
      'morning light through east window',
      'four paws off the ground',
    ],
    emotions: ['warmth', 'joy', 'grief', 'gratitude', 'love'],
    storyteller: { name: "Clover's Family" },
    emotional_journey: {
      overall_tone: 'warm and tender',
      current_state: 'grieving but grateful',
      turning_points: [
        'the first binkying morning',
        'the moment she chose them',
        'the last quiet day together',
      ],
    },
  },

  // Runtime extra fields (accessed via `as any` in the codebase)
  ...(({
    musicQuery: 'gentle warm tender loving peaceful',
    petMode: true,
    beatAudio: [],
    narratorVoice: 'Aoede',
  } as any) as Partial<ActiveStory>),
} as ActiveStory;


// Walter Haines — WWII Grandfather (Story Scribe demo) ───────────────────
export const DEMO_STORY_WALTER: ActiveStory = {
  sessionId: 'demo-walter-2026',
  storytellerName: 'Walter Haines',
  savedAt: '2026-04-19T00:00:00.000Z',
  narrative: `Walter Haines shipped out of New York Harbor in March of 1943. He was nineteen years old. He didn't talk about what he saw in Normandy for forty-seven years.

His granddaughter learned the truth the winter before he died — not from Walter himself, but from a letter her grandmother had kept in a cedar box, sealed in wax, never meant to be found. The letter was dated June 7, 1944. The day after D-Day.

Walter came home like a lot of men came home: quietly, with something behind his eyes that wasn't there before. He built a hardware store. He raised three kids. On Sunday mornings he made pancakes with a precision that bordered on the sacred, and he never explained why.

What he passed on wasn't the war. It was the after: the stubborn, beautiful, improbable fact of continuing. Of showing up. Of making pancakes when the world has given you every reason not to.

His granddaughter still makes them the same way. She will teach her children. The recipe doesn't have measurements. You just know when it's right.`,

  generatedImages: [
    {
      index: 0,
      success: true,
      image_url:
        'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1920&q=80',
      prompt: 'Cinematic WWII-era sepia portrait, dramatic light, American memorial, veterans',
    },
  ],

  storyboard: {
    story_beats: [
      {
        beat_title: 'March, 1943',
        narrative_chunk:
          'Walter Haines shipped out of New York Harbor in the early spring of 1943. He was nineteen years old. The harbor was full of men his age, all of them pretending not to be afraid. The sea was grey. The future was uncertain. He went anyway.',
        image_index: 0,
        themes: ['youth', 'departure', 'duty', 'courage'],
        directors_notes: 'Cinematic wide shot. Sepia tones. Young faces against a grey Atlantic sky.',
        visual_focus: 'Young soldier on ship deck, harbor skyline receding, early morning fog',
      },
      {
        beat_title: 'The Letter in the Cedar Box',
        narrative_chunk:
          "He didn't talk about Normandy for forty-seven years. His granddaughter learned the truth from a letter her grandmother had kept sealed in wax — never meant to be found. It was dated June 7th, 1944. The day after. The handwriting barely held itself together.",
        image_index: 0,
        themes: ['silence', 'witness', 'memory', 'the weight of surviving'],
        directors_notes: 'Close, intimate. The horror unnamed but present. Candlelight on aged paper.',
        visual_focus: 'Aged letter, wax seal broken, handwriting barely legible, trembling hands',
      },
      {
        beat_title: 'Coming Home',
        narrative_chunk:
          "He came home like a lot of men came home: quietly. With something behind his eyes that wasn't there before. He didn't speak of it. He built a hardware store on Main Street instead, and opened at seven every morning for thirty years.",
        image_index: 0,
        themes: ['return', 'resilience', 'rebuilding', 'quiet strength'],
        directors_notes: 'Warm small-town Americana. The beauty of ordinary, chosen things.',
        visual_focus: 'Hardware store front in morning light, OPEN sign, quiet familiar street',
      },
      {
        beat_title: 'Sunday Mornings',
        narrative_chunk:
          'On Sunday mornings he made pancakes with a precision that bordered on the sacred. The same cast-iron pan. The same arc of the ladle. His grandchildren lined up in their pajamas, and for one hour each week, the world was completely alright.',
        image_index: 0,
        themes: ['family', 'ritual', 'peace', 'the everyday sacred'],
        directors_notes: 'Warm domestic light. Children in pajamas. Cast iron pan. Golden morning kitchen.',
        visual_focus: 'Weathered hands pouring batter, cast-iron skillet, morning kitchen window light',
      },
      {
        beat_title: 'What He Never Said',
        narrative_chunk:
          "He never explained the pancakes. He never explained the way he'd sometimes stop mid-conversation and go quiet. His family learned not to ask. Some things survive better in silence, passed on in gestures rather than words.",
        image_index: 0,
        themes: ['unspoken love', 'trauma carried quietly', 'the shape of a life'],
        directors_notes: 'Still and reflective. The weight of the unsaid. Gentle and non-judgmental.',
        visual_focus: 'Man at kitchen table, coffee cup, window, far-off gaze — peaceful and private',
      },
      {
        beat_title: 'The Recipe Without Measurements',
        narrative_chunk:
          "His granddaughter still makes the pancakes. The recipe has no measurements — you just know when it's right. She will teach her children. Walter Haines carried a war inside him, and he chose — every Sunday morning — to make something warm instead.",
        image_index: 0,
        themes: ['legacy', 'love transmitted', 'chosen peace', 'continuity'],
        directors_notes: 'Quietly triumphant. The arc of a life resolved in grace. Warm gold light.',
        visual_focus: "Young woman's hands on same cast-iron pan, morning light, pancakes golden brown",
      },
    ],
  },

  extraction: {
    timeline: [
      { year: '1924', event: 'Walter Haines born', significance: 'Beginning of a generation-defining life' },
      { year: '1943', event: 'Ships out from New York Harbor, age 19', significance: 'Called to duty' },
      { year: '1944', event: 'Normandy, D-Day — the letter dated June 7th', significance: "The war's defining moment, never spoken of" },
      { year: '1946', event: 'Returns home, opens hardware store on Main Street', significance: 'The work of rebuilding begins' },
      { year: '2024', event: 'Walter Haines passes at 100', significance: 'A century of showing up' },
    ],
    family: [
      { name: 'Walter Haines', relationship: 'grandfather' },
      { name: 'Grandmother', relationship: 'wife' },
      { name: 'Granddaughter', relationship: 'granddaughter — narrator' },
    ],
    locations: [
      { name: 'New York Harbor', type: 'departure point' },
      { name: 'Normandy, France', type: 'battlefield' },
      { name: 'Main Street Hardware', type: "life's work" },
    ],
    key_quotes: [
      'He came home like a lot of men came home: quietly.',
      'He chose — every Sunday morning — to make something warm instead.',
      "The recipe has no measurements. You just know when it's right.",
    ],
    themes: ['sacrifice', 'resilience', 'the weight of silence', 'legacy', 'love as daily practice'],
    life_lessons: [
      'Continuity is its own form of courage',
      'What we choose to pass on defines us more than what we survived',
      'Love can be transmitted through ritual',
    ],
    sensory_details: [
      'cast-iron pan',
      'wax-sealed letter in cedar box',
      'New York Harbor fog',
      'grandchildren in pajamas',
      'Sunday morning kitchen light',
    ],
    emotions: ['duty', 'quiet grief', 'stubborn strength', 'familial love', 'bittersweet pride'],
    storyteller: { name: "Walter's Granddaughter" },
    emotional_journey: {
      overall_tone: 'cinematic and solemn',
      current_state: 'honouring and remembering',
      turning_points: [
        'shipping out in 1943',
        'the found letter',
        'the first Sunday pancakes',
        'passing the recipe on',
      ],
    },
  },

  // Runtime extra fields (accessed via `as any` in the codebase)
  ...(({
    musicQuery: 'cinematic dramatic orchestral solemn',
    petMode: false,
    beatAudio: [],
    narratorVoice: 'Aoede',
  } as any) as Partial<ActiveStory>),
} as ActiveStory;
