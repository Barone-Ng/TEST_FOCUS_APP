/* ============================================================
   ACHIEVEMENTS DATABASE
   ------------------------------------------------------------
   Add, remove, or edit achievements here. Each one needs:
     id    - unique string
     name  - display name
     icon  - emoji shown once unlocked (locked ones show 🔒)
     desc  - one line describing how to unlock it
     cond  - function(userData) => true/false, checked after every
             completed plant and every caught sunburst

   userData shape you can read inside cond():
     totalPlanted     - number of plants ever finished
     totalFocusSeconds- total seconds spent focusing
     sunCaught        - number of sunbursts tapped
     plantCounts      - { plantId: countGrown }
   ============================================================ */

const ACHIEVEMENTS = [
  { id: 'first_sprout',    name: 'First Sprout',     icon: '🌱', desc: 'Grow your very first plant.',              cond: d => d.totalPlanted >= 1 },
  { id: 'green_thumb',     name: 'Green Thumb',      icon: '🌿', desc: 'Grow 5 plants in total.',                   cond: d => d.totalPlanted >= 5 },
  { id: 'botanist',        name: 'Botanist',         icon: '🌳', desc: 'Grow 20 plants in total.',                  cond: d => d.totalPlanted >= 20 },
  { id: 'master_gardener', name: 'Master Gardener',  icon: '🏆', desc: 'Grow 50 plants in total.',                  cond: d => d.totalPlanted >= 50 },
  { id: 'sun_chaser',      name: 'Sun Chaser',       icon: '☀️', desc: 'Catch 10 sunbursts during focus sessions.', cond: d => d.sunCaught >= 10 },
  { id: 'solar_master',    name: 'Solar Master',     icon: '🌞', desc: 'Catch 50 sunbursts during focus sessions.', cond: d => d.sunCaught >= 50 },
  { id: 'full_garden',     name: 'Full Garden',      icon: '🌼', desc: 'Grow every plant type at least once.',      cond: d => PLANT_TYPES.every(p => (d.plantCounts[p.id] || 0) >= 1) },
  { id: 'dedicated',       name: 'Dedicated Grower', icon: '⏳', desc: 'Accumulate 5 hours of total focus time.',   cond: d => d.totalFocusSeconds >= 18000 },
  { id: 'moonlit',         name: 'Moonlit Bloom',    icon: '🌙', desc: 'Successfully grow a Moonflower.',           cond: d => (d.plantCounts['moonflower'] || 0) >= 1 },
];
