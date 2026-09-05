/* ============================================================
   PLANT TYPE DATABASE
   ------------------------------------------------------------
   This is the ONLY file you need to touch to add, remove, or
   tweak a plant species. Nothing else in the app needs to change.

   Fields:
     id        - unique string, no spaces (used internally, never shown)
     name      - display name shown to the player
     category  - short label shown under the name (e.g. "Flower", "Tree")
     minutes   - how many minutes of focus this plant needs to fully grow
     stages    - exactly 5 pieces of art, from seed to fully grown:
                 [ seed, sprout, growing, budding, mature ]
                 Each entry can be EITHER an emoji ('🌱') OR a path
                 to your own image, e.g. 'art/daisy/stage-2.png' or
                 'art/daisy/stage-2.svg'. The app detects which one
                 you used automatically by the file extension — mix
                 and match freely, e.g. use your own art for the
                 seed/sprout and an emoji for the rest while you're
                 still drawing.
     desc      - one line of flavor text (not shown in-app yet, but
                 available if you want to surface it later)
     unlock    - null                                   -> available from the start
                 { type:'totalPlanted', value: N }       -> unlocks once the
                 player has grown N plants of ANY kind in total

   To add a new plant: copy one of the objects below, give it a new
   unique id, and fill in the fields. To remove one: delete its object.
   The order here is also the display order in the "Grow" picker.
   ============================================================ */

const PLANT_TYPES = [
  {
    id: 'daisy',
    name: 'Cheerful Daisy',
    category: 'Flower',
    minutes: 10,
    stages: ['art/daisy_1.svg', 'art/daisy_2.svg', 'art/daisy_3.svg', 'art/daisy_4.svg', 'art/daisy_5.svg'],
    desc: 'A bright little flower for a short focus session.',
    unlock: null,
  },
  {
    id: 'sunflower',
    name: 'Golden Sunflower',
    category: 'Flower',
    minutes: 20,
    stages: ['art/sunflower_1.svg', 'art/sunflower_2.svg', 'art/sunflower_3.svg', 'art/sunflower_4.svg', 'art/sunflower_5.svg'],
    desc: 'A sunny companion for a medium-length focus session.',
    unlock: null,
  },
  {
    id: 'sakura',
    name: 'Sakura Sprout',
    category: 'Tree',
    minutes: 35,
    stages: ['🌰', '🌱', '🎋', '🌸', '🌸'],
    desc: 'Delicate blossoms that take a proper sit-down session to unfold.',
    unlock: { type: 'totalPlanted', value: 2 },
  },
  {
    id: 'bonsai',
    name: 'Bonsai Pine',
    category: 'Tree',
    minutes: 50,
    stages: ['🌰', '🌱', '🌲', '🌲', '🌲'],
    desc: 'Shaped slowly. A deep-work session for people who like structure.',
    unlock: { type: 'totalPlanted', value: 5 },
  },
  {
    id: 'mango',
    name: 'Mango Tree',
    category: 'Fruit Tree',
    minutes: 75,
    stages: ['🌰', '🌱', '🌴', '🌴', '🥭'],
    desc: 'A fruitful reward for an extended stretch of concentration.',
    unlock: { type: 'totalPlanted', value: 8 },
  },
  {
    id: 'bamboo',
    name: 'Golden Bamboo',
    category: 'Tree',
    minutes: 100,
    stages: ['🌰', '🌱', '🎍', '🎍', '🎍'],
    desc: 'Grows tall through sustained, patient discipline.',
    unlock: { type: 'totalPlanted', value: 12 },
  },
  {
    id: 'moonflower',
    name: 'Moonflower',
    category: 'Mystical',
    minutes: 150,
    stages: ['🌰', '🌱', '🌙', '🌺', '🌺'],
    desc: 'A rare bloom, said to only open for the truly dedicated.',
    unlock: { type: 'totalPlanted', value: 20 },
  },

  // ---- Add your own below, e.g.: ----
  // {
  //   id: 'cactus',
  //   name: 'Desert Cactus',
  //   category: 'Succulent',
  //   minutes: 15,
  //   stages: ['🌰', '🌱', '🌵', '🌵', '🌵'],
  //   desc: 'Thrives on very little — great for a quick focus sprint.',
  //   unlock: null,
  // },
];
