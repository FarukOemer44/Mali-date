// ============================================================
//  everything you might want to change lives in this file
// ============================================================
window.CONFIG = {
  herName: 'mali',
  hisName: 'faruk',

  // email notification: go to https://web3forms.com, type in faruk44_4@hotmail.de and
  // click "create access key". they email you the key, paste it here.
  // (the mail always goes to the address the key was created with)
  // leave empty = test mode (nothing gets sent, it just logs to the console)
  web3formsKey: '8b81ea2a-6adb-403d-9a5e-c751a5dcbfe2',
  notifyEmail: 'faruk44_4@hotmail.de', // just a reminder, the key decides where it goes

  // ---------- the 7 date spots ----------
  // speaker: 'me' = you (expressions: me:happy, me:love, me:tease), 'ask' = question with answer buttons
  dates: [
    {
      id: 'ceramics',
      title: 'ceramic painting',
      place: 'a paint-your-own ceramics studio',
      link: '',
      game: 'mug',
      intro: [
        ['me:happy', 'first stop: ceramic painting'],
        ['me', 'we each grab something plain and paint it however we want'],
        ['me:tease', 'no talent required. i am living proof of that'],
        ['ask', 'you ready?', ['give me the brush', 'only if you paint too']],
        ['me:happy', 'ok here\'s your mug. go crazy'],
      ],
      outro: [
        ['me:love', 'wait that actually looks so good??'],
        ['me', 'they put it in the kiln and we pick it up a few days later'],
        ['me:happy', 'and then you drink your matcha out of it every morning'],
      ],
      card: 'we paint mugs, plates, whatever we want. they fire it and we pick it up later. cozy, chill, kinda artsy.',
    },
    {
      id: 'mosaic',
      title: 'mosaic lamp workshop',
      place: 'orient art studio · hauptstr. 80, schöneberg',
      link: 'https://orientartstudio.de/',
      game: 'lamp',
      intro: [
        ['me', 'this one is a mosaic lamp workshop'],
        ['me', 'you glue tiny glass pieces on a lamp one by one'],
        ['me:love', 'and when you turn it on at night it looks unreal'],
        ['ask', 'wanna try?', ['yesss', 'is there green glass?']],
        ['me:tease', 'there\'s every colour. i\'ll be over here not breaking anything'],
      ],
      outro: [
        ['me:love', '...ok that\'s actually beautiful'],
        ['me', 'we each make one and take it home. it\'s like 3 hours but so worth it'],
      ],
      card: 'we make our own turkish mosaic lamps from scratch, piece by piece. takes a few hours and we take them home.',
    },
    {
      id: 'beads',
      title: 'make our own jewelry',
      place: 'takaay perlen-atelier · hobrechtstr. 25, neukölln',
      link: 'https://www.takaay.de/',
      game: 'beads',
      intro: [
        ['me:happy', 'bead studio!'],
        ['me', 'they have a whole wall of beads, gemstones, little charms, everything'],
        ['me', 'we pick what we like and make our own bracelets or necklaces'],
        ['ask', 'matching ones?', ['obviously', 'maybe hehe']],
        ['me:happy', 'catch the beads you want for your bracelet'],
      ],
      outro: [
        ['me:love', 'look at that bracelet. you have taste'],
        ['me:tease', 'we make one for each other and then we\'re forced to wear them forever. rules are rules'],
      ],
      card: 'we pick beads and make jewelry for each other. matching bracelets maybe. you choose mine, i choose yours.',
    },
    {
      id: 'cinema',
      title: 'movie night',
      place: 'the cinema',
      link: '',
      game: 'popcorn',
      intro: [
        ['me:happy', 'cinema. classic but elite'],
        ['me', 'big screen, dark room, too much popcorn'],
        ['ask', 'who picks the movie?', ['me obviously', 'we fight about it']],
        ['me:tease', 'fair. i\'m on popcorn duty, you catch it'],
        ['me', 'oh and dodge the spoilers, people are evil'],
      ],
      outro: [
        ['me:happy', 'popcorn secured, zero spoilers. perfect'],
        ['me:love', 'and if they ever bring a jjk movie back we\'re going day one'],
      ],
      card: 'cinema date. you pick the movie, i get the snacks. we argue about it after.',
    },
    {
      id: 'flea',
      title: 'flea market',
      place: 'a flea market on a sunday',
      link: '',
      game: 'fleaquest',
      intro: [
        ['me:happy', 'flea market sunday :)'],
        ['me', 'we walk around, dig through every stall, buy things we don\'t need'],
        ['me:tease', 'and rumour says there\'s something legendary hidden here somewhere...'],
        ['ask', 'ready?', ['let\'s go hunting', 'i\'m gonna buy everything']],
      ],
      outro: [
        ['me:love', 'you literally beat a junk golem with a sword from a flea market'],
        ['me:happy', 'best sunday ever. and you keep the hat btw. it suits you way too well'],
        ['me', 'then coffee after and we look at everything we bought'],
      ],
      card: 'we stroll through a flea market, dig for treasure (maybe even finn\'s hat), get coffee, carry way too many bags home.',
    },
    {
      id: 'ikea',
      title: 'ikea date',
      place: 'ikea',
      link: '',
      game: 'maze',
      intro: [
        ['me:tease', 'ikea. yes. hear me out'],
        ['me', 'we walk through all the fake rooms and pretend we live there'],
        ['me:happy', 'we pick our dream kitchen. i lie down on every bed'],
        ['ask', 'convinced?', ['honestly yes', 'only for the vegan meatballs']],
        ['me', 'find the way to the vegan meatballs. follow the arrows if you get lost'],
      ],
      outro: [
        ['me:happy', 'vegan meatballs reached. veggie hot dog on the way out too'],
        ['me:tease', 'and we definitely come home with candles and a plant we didn\'t plan on'],
      ],
      card: 'we walk through every showroom, plan our dream apartment, eat vegan meatballs, come home with candles and plants.',
    },
    {
      id: 'cabin',
      title: 'cabin weekend',
      place: 'a little cabin in the woods, brandenburg',
      link: '',
      game: 'fireflies',
      intro: [
        ['me', 'and the big one: a weekend getaway'],
        ['me:love', 'little cabin in the woods somewhere in brandenburg. just us'],
        ['me', 'fireplace, cooking together, walking in the forest, no city noise'],
        ['ask', 'how does that sound?', ['dreamy', 'can we bring a cat']],
        ['me:happy', 'it gets dark early out there... catch some fireflies'],
      ],
      outro: [
        ['me:love', 'campfire, stars, fireflies, you'],
        ['me', 'yeah. this one would be special'],
      ],
      card: 'a whole weekend away. cabin in the woods in brandenburg, campfire, cooking, long walks, no stress.',
    },
  ],

  // cats walking around town (same order as the rows in assets/chars/cats.png)
  cats: [
    { name: 'gojo', say: 'nah, i\'d purr. (he\'s the strongest cat btw)' },
    { name: 'geto', say: 'hmmm... he normally doesn\'t let anyone pet him. you\'re the exception' },
    { name: 'yuji', say: 'headbutts your hand. very friendly boy' },
    { name: 'nanami', say: 'it\'s past 6. he\'s off the clock. pets accepted anyway' },
    { name: 'toge', say: '"mrrp... tuna mayo"' },
    // row = which cat sprite they use (0 white, 1 black, 2 orange, 3 cream, 4 grey)
    { name: 'megumi', row: 1, say: 'very serious cat. secretly loves head scratches' },
    { name: 'nobara', row: 2, say: 'demands pets. then demands more pets' },
    { name: 'panda', row: 0, say: 'is he even a cat? who cares, he\'s soft' },
    { name: 'maki', row: 3, say: 'doesn\'t need anyone. purrs anyway' },
    { name: 'yuta', row: 4, say: 'shy at first, then follows you around' },
  ],
};
