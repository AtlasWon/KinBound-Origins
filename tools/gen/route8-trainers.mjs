// Adds (or replaces) the ten Trainers who stand on Route 8, in the charcoal
// hollow and over the Wintergate.
//
//   node tools/gen/route8-trainers.mjs
//
// It rewrites only its own ten rows in data/trainers/trainers.json and leaves
// everything else in the file exactly where it was, so it is safe to re-run
// while other people are adding their own.
//
// LEVELS ARE MEASURED, NOT FELT. tests/helpers/simulate.mjs says a team-raising
// player leaves Harrowgate at 34 and a solo lead leaves it at 45, so the aces
// below sit at 32-34 on the climb and 35-37 over the col: two under the
// team-raiser, which is the margin every route since Route 5 has been cut to.
// The player has asked four separate times for an easier game and Act 5 has
// three Halls and the hardest rival battle in the story in it. The roads are
// where the room for that comes from, and none of these ten is a wall.
//
// EVERY ONE OF THEM IS DOING A JOB THAT HAS GONE WRONG THIS MONTH, and none of
// them says so as a warning. A drover is a month early, a forester cannot dry
// timber, a carter has a road nobody will repair, an ice cutter has a gauge
// that goes up and down. Canon asks for the world to visibly respond to the
// storm; on a mountain road that is five people with a grievance, and the
// player is the only one who hears all five.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'data/trainers/trainers.json';
const all = JSON.parse(readFileSync(path, 'utf8'));

const rows = [
  {
    id: 'r8_drover', name: 'Nell', className: 'Drover', sprite: 'villager_m', ai: 'trained', payout: 140,
    party: [{ species: 'nibbet', level: 31 }, { species: 'tuftail', level: 31 }, { species: 'burrowen', level: 32 }],
    intro: ['Forty head down to the winter pasture, a month before I ever have.',
      'I am not in a hurry and I am not in a mood. Fight me while they drink.'],
    defeat: ['Fair enough. Mind the gate.'],
    victory: ['Everything on this road is going the same way. Down.'],
    afterward: ['I have brought them down in the last week of the tenth month my whole life.',
      'This is the eighth. Ask anybody up there, they will all tell you something like it.'],
  },
  {
    id: 'r8_forester', name: 'Ord', className: 'Forester', sprite: 'hiker', ai: 'trained', payout: 144,
    party: [{ species: 'pipwing', level: 31 }, { species: 'mossback', level: 32 }, { species: 'bristlebuck', level: 33 }],
    intro: ['Marking for the winter fell. Or I was, before the wood went wrong on me.',
      'Come on, then. It is not as though I am cutting anything today.'],
    defeat: ['Good. Something went right.'],
    victory: ['Twenty years in this wood. I know what it does.'],
    afterward: ['Standing timber is dry as a bone in the eighth month. Always.',
      'Every stick I have put a saw to this week has run wet down my arm.'],
  },
  {
    id: 'r8_agent', name: 'Peral', className: 'Foundation Agent', sprite: 'meridian', ai: 'veteran', payout: 156,
    party: [{ species: 'fizzlet', level: 32 }, { species: 'lantric', level: 33 }],
    intro: ['Station Four. You can go in. The readings are public, it says so on the board.',
      'You can also go in the hard way. Some people would rather.'],
    defeat: ['Right. In you go. Ask her anything you like.'],
    victory: ['Public does not mean unattended.'],
    afterward: ['I have stood on this gate two years and never turned anybody away.',
      'Nobody has ever wanted to know before.'],
  },
  {
    id: 'r8_carter', name: 'Bram', className: 'Carter', sprite: 'porter', ai: 'trained', payout: 148,
    party: [{ species: 'pebblet', level: 32 }, { species: 'nibbet', level: 32 }, { species: 'cairnling', level: 33 }],
    intro: ['Empty going up, loaded coming down, and the road worse every trip.',
      'Give me five minutes of not thinking about the road.'],
    defeat: ['That did it. Thanks.'],
    victory: ['Try that with a ton behind you.'],
    afterward: ['They will have to cut a new line round that slide before the spring.',
      'They will not. There is no money in a road to two thousand people.'],
  },
  {
    id: 'r8_warden', name: 'Sisel', className: 'Snow Warden', sprite: 'hiker', ai: 'veteran', payout: 160,
    party: [{ species: 'frostnip', level: 32 }, { species: 'chalkid', level: 33 }, { species: 'rimehound', level: 34 }],
    intro: ['Warden. I dig milestones out and I count cairns, and I have done both twice this month.',
      'You are dressed for a road. Not for this one. Let me see what else you have.'],
    defeat: ['Better than the coat, anyway.'],
    victory: ['Keep them on your right. That is all I ask of anybody.'],
    afterward: ['Forty-one cairns between the gate and the town. Forty-one last month as well.',
      'It is the only number up here that has not changed.'],
  },
  {
    id: 'r8k_burner', name: 'Ivet', className: 'Kiln Hand', sprite: 'villager_f', ai: 'trained', payout: 150,
    party: [{ species: 'sootmoth', level: 33 }, { species: 'nettlebug', level: 32 }, { species: 'tuftail', level: 33 }],
    intro: ['Nine burns. We do twenty-one by now. Every year. Since my grandmother.',
      'I have nothing to do and I am furious about it. Come here.'],
    defeat: ['That is the first thing that has burned properly all month.'],
    victory: ['Anger is not a disadvantage. Ask anybody who works a pit.'],
    afterward: ['Wet wood does not burn. It steams, and steam is not charcoal.',
      'The town gets cold in three weeks and we are twelve burns short of it.'],
  },
  {
    id: 'r8p_packman', name: 'Coll', className: 'Packman', sprite: 'porter', ai: 'trained', payout: 168,
    party: [{ species: 'burrowen', level: 33 }, { species: 'cairnling', level: 33 }, { species: 'rimehound', level: 34 }],
    intro: ['Everything the town eats between now and the thaw goes over that col on a back.',
      'Mostly mine. Five minutes.'],
    defeat: ['Right. Up.'],
    victory: ['I carry ninety pounds over that twice a week.'],
    afterward: ['The road shuts in the tenth month. Normally.',
      'I have started going twice a week instead of once. Nobody told me to.'],
  },
  {
    id: 'r8p_iceman', name: 'Halder', className: 'Ice Cutter', sprite: 'dockhand', ai: 'trained', payout: 170,
    party: [{ species: 'frostnip', level: 33 }, { species: 'rillfry', level: 33 }, { species: 'currentail', level: 34 }],
    intro: ['Do not walk on it. I will say that first and then we can do this properly.',
      'Everybody says do not walk on it. I am the one who measures it.'],
    defeat: ['Still do not walk on it.'],
    victory: ['Six inches. Six. Five. Seven. Four. In five days.'],
    afterward: ['Sound ice thickens. That is what it does. It is the only thing it does.',
      'Mine has gone up and down all week like a tide. Ice does not have a tide.'],
  },
  {
    id: 'r8p_lakewarden', name: 'Ruen', className: 'Lake Warden', sprite: 'hiker', ai: 'veteran', payout: 176,
    party: [{ species: 'frostnip', level: 33 }, { species: 'deeplum', level: 34 }, { species: 'rimehound', level: 35 }],
    intro: ['You came round. Good. Most people come round.',
      'The ones who do not, I go out and get. Let us see which you are.'],
    defeat: ['Round. Every time. Thank you.'],
    victory: ['It is not longer than a funeral.'],
    afterward: ['Four people off that lake in eleven years.',
      'Two of them this month. Both said it looked the same as it always looks.'],
  },
  {
    id: 'r8p_gatewarden', name: 'Anse', className: 'Pass Warden', sprite: 'villager_m', ai: 'veteran', payout: 184,
    party: [{ species: 'cairnling', level: 34 }, { species: 'chalkid', level: 34 }, { species: 'rimehound', level: 35 }],
    intro: ['The Wintergate. Four tiles of mountain and then it is downhill into the town.',
      'Everybody through here gets asked the same thing. Show me you could get back.'],
    defeat: ['Go on down. The light on the hill is the Observatory.'],
    victory: ['Then you go down in the morning, with somebody. That is the rule, not a slight.'],
    afterward: ['Two thousand eight hundred people up there and all of them know when the road shuts.',
      'It has not shut. It is three weeks late, and nobody in that town is sleeping.'],
  },
];

const ids = new Set(rows.map((r) => r.id));
const kept = all.filter((t) => !ids.has(t.id));
writeFileSync(path, JSON.stringify([...kept, ...rows], null, 2) + '\n');
console.log(`  trainers.json: ${kept.length} untouched, ${rows.length} written`);
