// The encounter tables, Trainers and dialogue for Route 9, the falls and the
// Crown Road.
//
//   node tools/gen/route9-content.mjs
//
// It rewrites only its own rows in data/trainers/trainers.json and leaves
// everything else in that file exactly where it was, so it is safe to re-run
// while other people are adding theirs.
//
// LEVELS ARE MEASURED. tests/helpers/simulate.mjs is the authority, not feel.
// The player has asked four separate times for an easier game, and Act 5 puts
// three Halls and the hardest rival battle in the story in front of them -- so
// the roads between those are where the room comes from, and every ace below
// sits two under where the table says a team-raising player will be.
//
// THE TYPE PROBLEM ON THESE TWO ROADS, and why the tables look the way they
// do. Route 9 is canonically Gale and Spark, and the chart says Gale hits the
// Flame starter's final form for double and Spark hits the Tide starter's for
// double. A route that is half Gale and half Spark therefore locks out two of
// the three starters at once, which is the mistake Route 6 nearly shipped with
// Chitin. So the identity is capped: thirty-four per cent Gale-typed, and the
// Spark is concentrated in three slots rather than spread. The rest is STONE,
// which is exactly neutral against all three starters both ways, and BEAST,
// which is neutral against two and resisted by the third.
import { readFileSync, writeFileSync } from 'node:fs';

const slots = (a) => a.map(([species, minLevel, maxLevel, weight]) => ({ species, minLevel, maxLevel, weight }));
const table = (mapId, comment, methods) => {
  const total = Object.entries(methods);
  for (const [m, t] of total) {
    const sum = t.slots.reduce((n, s) => n + s.weight, 0);
    if (sum !== 100) throw new Error(`${mapId}/${m} weights total ${sum}`);
  }
  writeFileSync(`data/encounters/${mapId}.json`,
    JSON.stringify({ mapId, $comment: comment, methods }, null, 2) + '\n');
  console.log(`  wrote data/encounters/${mapId}.json`);
};

table('route_9',
  'The Skyreach Stair. Gale and Spark are what canon puts on these cliffs and both of them are dangerous to a starter: Gale is double on Volcatrix and Spark is double on Maelstrix, so a table that is half of each locks two of the three players out of their own road. It is capped instead. Thirty-four of every hundred Kin here are Gale-typed, twenty-four are Spark-typed, and the other forty-two are Stone and Beast, which are the two families in the chart that cannot punish anybody. Craglide carries both halves at once -- Stone/Gale, at home on a cliff, and the commonest thing on the plateau.\n\nMEASURED, not guessed at. Levels are 35-40 against a team-raising player who arrives from the Frost Hall at about 40 and a solo lead a good deal above that.',
  {
    tallGrass: {
      rate: 160,
      slots: slots([
        ['kestrelle', 36, 38, 12],
        ['craglide', 37, 39, 12],
        ['chalkid', 35, 37, 12],
        ['fizzlet', 35, 37, 10],
        ['voltwick', 37, 39, 8],
        ['chalkmar', 38, 40, 8],
        ['cairnling', 36, 38, 8],
        ['bristlebuck', 37, 39, 8],
        ['lantric', 37, 39, 6],
        ['pipwing', 35, 37, 6],
        ['burrowen', 36, 38, 6],
        ['galecrest', 39, 40, 4],
      ]),
    },
  });

table('route_9_falls',
  'Behind the fall. The rare slot is Brinewisp, and it is here for a reason the player can work out by standing in the room: a Tide/Spirit that the Vellum places in dead water belongs in a plunge pool nobody has ever seen the bottom of, and the last one the player met was four acts and two hundred miles ago on the coast. Everything else on this table is what shelters out of a gale -- Gale Kin that are not flying today, one Spark off the wet rock, and the Stone that lives in the cliff itself.',
  {
    tallGrass: {
      rate: 150,
      slots: slots([
        ['gullswift', 37, 39, 20],
        ['craglide', 38, 40, 16],
        ['fizzlet', 37, 39, 16],
        ['kestrelle', 38, 40, 14],
        ['chalkid', 37, 39, 14],
        ['rillfry', 36, 38, 12],
        ['brinewisp', 39, 41, 8],
      ]),
    },
    water: {
      rate: 110,
      slots: slots([
        ['brinewisp', 39, 42, 34],
        ['currentail', 38, 41, 30],
        ['gullswift', 38, 41, 20],
        ['rillfry', 37, 40, 16],
      ]),
    },
    fishGood: {
      slots: slots([
        ['currentail', 38, 42, 45],
        ['anchorling', 39, 43, 30],
        ['clatterclaw', 39, 43, 25],
      ]),
    },
  });

table('route_10',
  'The Crown Road, and the widest table in the game. That is the point of it rather than an accident: the eighth Hall is two miles down this road and its Keeper fights with a mixed team, so the road in front of it is the one place in Caelora where a player meets a bit of everything and has to answer all of it. Eleven slots, seven types, nothing over twelve per cent, and no two of the top four sharing a weakness.\n\nMEASURED. Levels are 41-45 against a team-raising player who arrives from the Gale Hall at about 45. Menhir and Galecrest carry the top of the band at eight and eight -- they are the two fully evolved Kin out here and meeting one should be an event rather than a tax.',
  {
    tallGrass: {
      rate: 158,
      slots: slots([
        ['bristlebuck', 39, 41, 12],
        ['burrowen', 39, 41, 12],
        ['chalkmar', 40, 42, 10],
        ['craglide', 40, 42, 10],
        ['kestrelle', 39, 41, 10],
        ['menhir', 41, 43, 8],
        ['galecrest', 41, 43, 8],
        ['voltwick', 40, 42, 8],
        ['mossback', 39, 41, 8],
        ['tallowmoth', 40, 42, 8],
        ['weaverjaw', 41, 43, 6],
      ]),
    },
    water: {
      rate: 110,
      slots: slots([
        ['currentail', 41, 44, 40],
        ['gullswift', 41, 44, 30],
        ['rillfry', 40, 43, 30],
      ]),
    },
    fishGood: {
      slots: slots([
        ['currentail', 41, 45, 45],
        ['anchorling', 42, 46, 30],
        ['clatterclaw', 42, 46, 25],
      ]),
    },
  });

/* ---------------------------------------------------------------- trainers */

const rows = [
  {
    id: 'r9_carter', name: 'Wend', className: 'Carter', sprite: 'porter', ai: 'trained', payout: 190,
    party: [{ species: 'nibbet', level: 34 }, { species: 'chalkid', level: 35 }, { species: 'kestrelle', level: 36 }],
    intro: ['Four miles and all of them up, and a bridge in the middle you cannot take a cart over.',
      'So it comes off here and goes on a back. Ask me how I feel about that.'],
    defeat: ['Better. Go on.'],
    victory: ['Everything on this road is carried. Remember that when you get up there.'],
    afterward: ['Skyreach has an airship dock and a lift and a hundred feet of crane.',
      'And the last four miles of everything it eats comes up on a person.'],
  },
  {
    id: 'r9_ropewalker', name: 'Sev', className: 'Ropewalker', sprite: 'sailor', ai: 'veteran', payout: 204,
    party: [{ species: 'slatewing', level: 34 }, { species: 'chalkid', level: 35 }, { species: 'craglide', level: 35 }],
    intro: ['You are about to walk it. Everybody stops here first and pretends they are not.',
      'Have a fight instead. It is the same amount of not looking down.'],
    defeat: ['Right. Off you go. Do not stop in the middle.'],
    victory: ['Nobody has ever fallen off it. I say that a great deal.'],
    afterward: ['Two cables, eleven years, inspected the sixteenth of every month.',
      'I have inspected it three times this week. Nobody asked me to.'],
  },
  {
    id: 'r9_windwatch', name: 'Idris', className: 'Foundation Windwatch', sprite: 'meridian_sci_f', ai: 'veteran', payout: 212,
    party: [{ species: 'fizzlet', level: 34 }, { species: 'chalkid', level: 35 }, { species: 'voltwick', level: 35 }],
    intro: ['Wind station. I count gusts and I write down a number and I send it to Aureline.',
      'Aureline has stopped writing back. So I have some time.'],
    defeat: ['Take the readings if you want them. Everybody should have them.'],
    victory: ['Forty, gusting sixty, out of a quarter it has never come from.'],
    afterward: ['This wind is backing. Backing means the whole system is turning round.',
      'Systems that size turn over a season. This one has done it in eleven days.'],
  },
  {
    id: 'r9_shepherd', name: 'Ferrow', className: 'Cliff Shepherd', sprite: 'villager_f', ai: 'trained', payout: 198,
    party: [{ species: 'tuftail', level: 33 }, { species: 'cairnling', level: 34 }, { species: 'bristlebuck', level: 35 }],
    intro: ['They graze the top and they know the edge better than I do.',
      'They have not gone near it for a week. That is the whole of my news.'],
    defeat: ['There. Now I have two things to think about.'],
    victory: ['They stay off the edge and so do I.'],
    afterward: ['A sheep will stand on a foot of ledge in a gale and think nothing of it.',
      'Mine are all lying down in the middle of a field. Every one of them.'],
  },
  {
    id: 'r9_dockrunner', name: 'Pell', className: 'Dock Runner', sprite: 'dockhand', ai: 'veteran', payout: 220,
    party: [{ species: 'pipwing', level: 34 }, { species: 'chalkmar', level: 35 }, { species: 'kestrelle', level: 36 }],
    intro: ['Docks are shut. Third day. I run the messages down the road instead.',
      'I am quick and I am bored, and those are the two worst things to be at once.'],
    defeat: ['Fine. Fine! Go and see it for yourself.'],
    victory: ['Quick, see.'],
    afterward: ['Nothing has come in or gone out of Skyreach by air since the twelfth.',
      'There is an airship sitting on the plateau under sixty ropes and nobody will move it.'],
  },
  {
    id: 'r9f_hermit', name: 'Ossa', className: 'Waterkeeper', sprite: 'elder', ai: 'veteran', payout: 216,
    party: [{ species: 'rillfry', level: 34 }, { species: 'chalkid', level: 35 }, { species: 'brinewisp', level: 36 }],
    intro: ['Quiet in here, is it not. That is what everybody says and then they say nothing else.',
      'Sit a moment. Then earn the moment.'],
    defeat: ['Good. Sit as long as you like.'],
    victory: ['The water has been coming over harder every day. It does not usually.'],
    afterward: ['Sixty years of names on that ledge and every one of them cut in the dry.',
      'I cut mine at the far end because I thought I had room. The pool is four marks up on it.'],
  },
  {
    id: 'r10_toll', name: 'Marrek', className: 'Tollkeeper', sprite: 'villager_m', ai: 'trained', payout: 232,
    party: [{ species: 'nibbet', level: 37 }, { species: 'mossback', level: 38 }, { species: 'burrowen', level: 39 }],
    intro: ['Foot passage is free. It has been free since before there was a toll.',
      'A fight is not free. A fight is the best thing that has happened to me this month.'],
    defeat: ['On you go. Mind the arch, everybody looks up at it and walks into the kerb.'],
    victory: ['Nine hundred years of road and nobody has ever hurried on it.'],
    afterward: ['My family has kept this gate for six generations and never once shut it.',
      'Crownspire shut ITS gate on the fourteenth. First time in my life.'],
  },
  {
    id: 'r10_drover', name: 'Isolde', className: 'Drover', sprite: 'villager_f', ai: 'trained', payout: 236,
    party: [{ species: 'tuftail', level: 37 }, { species: 'chalkid', level: 38 }, { species: 'bristlebuck', level: 39 }],
    intro: ['Down off the top for the winter, same as every year, and the road is full.',
      'Full of everybody else doing the same a month early. Move, and I will show you why I am cross.'],
    defeat: ['Right. Now shift.'],
    victory: ['Twenty years and I have never queued on the Crown Road.'],
    afterward: ['There are four droves on this road today. There should be none until the tenth month.',
      'Nobody arranged it. We all just went.'],
  },
  {
    id: 'r10_terrace', name: 'Hesk', className: 'Terrace Walker', sprite: 'hiker', ai: 'veteran', payout: 244,
    party: [{ species: 'cairnling', level: 37 }, { species: 'gravelet', level: 38 }, { species: 'menhir', level: 39 }],
    intro: ['Nine hundred years of terraces down there and not a soul on them since the plague year.',
      'I walk them. Somebody should. Come down and see what walks them with me.'],
    defeat: ['Good. Go and look at the bottom one. Take your time.'],
    victory: ['Everything up here is older than everything anybody says about it.'],
    afterward: ['They fed a city of forty thousand off these steps.',
      'Then they did not need to, and in one generation nobody could remember how.'],
  },
  {
    id: 'r10_courier', name: 'Anvet', className: 'City Courier', sprite: 'porter', ai: 'veteran', payout: 252,
    party: [{ species: 'fizzlet', level: 38 }, { species: 'burrowen', level: 39 }, { species: 'chalkmar', level: 40 }],
    intro: ['Crownspire to Skyreach and back, twice a day, and I have never once been late.',
      'I have been late four times this fortnight. Get out of the road or be in it properly.'],
    defeat: ['Late again. Worth it.'],
    victory: ['Told you.'],
    afterward: ['It is the weather. Everyone says it is the weather like that explains it.',
      'The weather is the THING that is wrong. It is not the reason.'],
  },
  {
    id: 'r10_gatehand', name: 'Sefa', className: 'Gate Hand', sprite: 'townsfolk_f', ai: 'veteran', payout: 252,
    party: [{ species: 'craglide', level: 36 }, { species: 'bristlebuck', level: 38 }, { species: 'cairnling', level: 39 }],
    intro: ['Last mile. Everybody coming to the Hall comes past me and most of them are not ready.',
      'I am not the Keeper and I am not going to be kind about it either.'],
    defeat: ['Go on in. You will do.'],
    victory: ['Come back when three of them can stand up.'],
    afterward: ['The Keeper in there does not fight with one type. She fights with all of them.',
      'Whatever you have been leaning on for eight Halls, she has the answer to it.'],
  },
];

const path = 'data/trainers/trainers.json';
const all = JSON.parse(readFileSync(path, 'utf8'));
const ids = new Set(rows.map((r) => r.id));
const kept = all.filter((t) => !ids.has(t.id));
writeFileSync(path, JSON.stringify([...kept, ...rows], null, 2) + '\n');
console.log(`  trainers.json: ${kept.length} untouched, ${rows.length} written`);
