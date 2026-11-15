/* Blizzard content catalog */
window.BLIZ = {
  games: [
    { id:'sled-storm', name:'Sled Storm 3D', file:'sled-storm.html', cat:'Racing', icon:'🛷', g1:'#3aa8ff', g2:'#c7f0ff',
      desc:'Bomb down an endless snowy mountain. Dodge trees, hit ramps, grab gifts.' },
    { id:'frost-blocks', name:'Frost Blocks', file:'frost-blocks.html', cat:'Puzzle', icon:'🧊', g1:'#7b5cff', g2:'#3ad1ff',
      desc:'Drop ice blocks on the grid. Fill rows and columns to shatter them.' },
    { id:'hollow-house-1', name:'Hollow House', file:'hollow-house.html?ch=1', cat:'Horror', icon:'🏚️', num:'1', g1:'#3b0d1a', g2:'#7a1f3d',
      desc:'Wake up in a dark house. Find the items and escape before the Warden finds you.' },
    { id:'hollow-house-2', name:'Hollow House 2', file:'hollow-house.html?ch=2', cat:'Horror', icon:'🕯️', num:'2', g1:'#2a0f2f', g2:'#6b2a6f',
      desc:'Two floors, a screeching crow, and a car in the garage that needs fixing.' },
    { id:'hollow-house-3', name:'Hollow House 3', file:'hollow-house.html?ch=3', cat:'Horror', icon:'🗝️', num:'3', g1:'#0e1a2a', g2:'#3a1f4f',
      desc:'A huge manor with a basement and a faster Warden. Escape through the sewers.' },
    { id:'gem-freeze', name:'Gem Freeze', file:'gem-freeze.html', cat:'Puzzle', icon:'💎', g1:'#ff4fd8', g2:'#ffb84f',
      desc:'Swap frozen gems to make matches of 3 or more. Beat 20+ levels.' },
    { id:'ice-tunnel', name:'Ice Tunnel', file:'ice-tunnel.html?v=1', cat:'Arcade', icon:'🌀', num:'1', g1:'#0047ff', g2:'#00e5ff',
      desc:'Fly through a neon tube at crazy speed. Rotate to dodge the walls.' },
    { id:'ice-tunnel-2', name:'Ice Tunnel 2', file:'ice-tunnel.html?v=2', cat:'Arcade', icon:'🌈', num:'2', g1:'#ff2d95', g2:'#7b2dff',
      desc:'Faster, twistier, color-shifting tunnel with moving obstacles.' },
    { id:'road-escape-1', name:'Road Escape', file:'road-escape.html?ch=1', cat:'Racing', icon:'🚗', num:'1', g1:'#ff6a3d', g2:'#ffd23d',
      desc:'Break out of the city block. Lose the chasers and reach the exit.' },
    { id:'road-escape-2', name:'Road Escape 2', file:'road-escape.html?ch=2', cat:'Racing', icon:'🚙', num:'2', g1:'#ff3d5a', g2:'#ff9f3d',
      desc:'Weave through highway traffic, dodge roadblocks and the helicopter.' },
    { id:'road-escape-3', name:'Road Escape 3', file:'road-escape.html?ch=3', cat:'Racing', icon:'🏎️', num:'3', g1:'#1d2b64', g2:'#f8306c',
      desc:'Night city, spike strips, a bridge jump and the clock is ticking.' },
  ],

  /* YouTube videos (all checked as embeddable) */
  videos: [
    { id:'aqz-KE-bpKQ', t:'Big Buck Bunny 60fps 4K', ch:'Blender', cat:'Animation' },
    { id:'eRsGyueVLvQ', t:'Sintel - Open Movie', ch:'Blender', cat:'Animation' },
    { id:'_cMxraX_5RE', t:'Sprite Fright - Open Movie', ch:'Blender Studio', cat:'Animation' },
    { id:'mN0zPOpADL4', t:'Agent 327: Operation Barbershop', ch:'Blender Studio', cat:'Animation' },
    { id:'WhWc3b3KhnY', t:'Spring - Open Movie', ch:'Blender Studio', cat:'Animation' },
    { id:'Z4C82eyhwgU', t:'Caminandes 2: Gran Dillama', ch:'Blender', cat:'Animation' },
    { id:'Y-rmzh0PI3c', t:'Cosmos Laundromat - First Cycle', ch:'Blender', cat:'Animation' },
    { id:'dQw4w9WgXcQ', t:'Rick Astley - Never Gonna Give You Up', ch:'Rick Astley', cat:'Music' },
    { id:'9bZkp7q19f0', t:'PSY - GANGNAM STYLE', ch:'officialpsy', cat:'Music' },
    { id:'kJQP7kiw5Fk', t:'Luis Fonsi - Despacito ft. Daddy Yankee', ch:'LuisFonsiVEVO', cat:'Music' },
    { id:'OPf0YbXqDm0', t:'Mark Ronson - Uptown Funk ft. Bruno Mars', ch:'MarkRonsonVEVO', cat:'Music' },
    { id:'JGwWNGJdvx8', t:'Ed Sheeran - Shape of You', ch:'Ed Sheeran', cat:'Music' },
    { id:'2Vv-BfVoq4g', t:'Ed Sheeran - Perfect', ch:'Ed Sheeran', cat:'Music' },
    { id:'fJ9rUzIMcZQ', t:'Queen - Bohemian Rhapsody', ch:'Queen Official', cat:'Music' },
    { id:'hT_nvWreIhg', t:'OneRepublic - Counting Stars', ch:'OneRepublicVEVO', cat:'Music' },
    { id:'60ItHLz5WEA', t:'Alan Walker - Faded', ch:'Alan Walker', cat:'Music' },
    { id:'RgKAFK5djSk', t:'Wiz Khalifa - See You Again ft. Charlie Puth', ch:'Wiz Khalifa Music', cat:'Music' },
    { id:'CevxZvSJLk8', t:'Katy Perry - Roar', ch:'KatyPerryVEVO', cat:'Music' },
    { id:'YQHsXMglC9A', t:'Adele - Hello', ch:'Adele', cat:'Music' },
    { id:'pRpeEdMmmQ0', t:'Shakira - Waka Waka', ch:'shakiraVEVO', cat:'Music' },
    { id:'LXb3EKWsInQ', t:'COSTA RICA IN 4K 60fps HDR', ch:'Jacob + Katie Schwarz', cat:'Travel' },
    { id:'1La4QzGeaaQ', t:'Peru 8K HDR 60FPS', ch:'Jacob + Katie Schwarz', cat:'Travel' },
    { id:'hY7m5jjJ9mM', t:'CATS will make you LAUGH YOUR HEAD OFF', ch:'Tiger FunnyWorks', cat:'Funny' },
    { id:'SkgTxQm9DWM', t:'Nyan Cat - 10 HOURS', ch:'Bufu Sounds', cat:'Funny' },
    { id:'jNQXAC9IVRw', t:'Me at the zoo (the first YouTube video)', ch:'jawed', cat:'Funny' },
    { id:'8aGhZQkoFbQ', t:'What the heck is the event loop anyway?', ch:'JSConf', cat:'Learn' },
  ],

  /* TikTok creators (shown with TikTok's official embed) */
  tiktokers: [
    { u:'nasa', n:'NASA', d:'Space, rockets and astronauts' },
    { u:'natgeo', n:'National Geographic', d:'Animals and our planet' },
    { u:'nba', n:'NBA', d:'Basketball highlights' },
    { u:'duolingo', n:'Duolingo', d:'The famous green owl' },
    { u:'espn', n:'ESPN', d:'Sports moments' },
    { u:'sciencemuseum', n:'Science Museum', d:'Cool science' },
  ],

  /* BlizzardMovies: full-length public-domain & Creative Commons films (all checked playable) */
  movies: [
   {
    "title": "Star Wreck: In the Pirkining",
    "year": 2005,
    "src": "ia",
    "id": "StarWreckInThePirkining",
    "row": "Newest free movies",
    "len": "1h 44m",
    "mins": 104,
    "d": "A space-fleet captain gets stranded in the past and decides to conquer Earth. A fan-made sci-fi comedy epic."
   },
   {
    "title": "Valkaama",
    "year": 2010,
    "src": "ia",
    "id": "valkaama",
    "row": "Newest free movies",
    "len": "1h 33m",
    "mins": 93,
    "d": "Two friends set off on a road trip to find a lake that may only exist in legend. A Creative Commons open movie."
   },
   {
    "title": "Sita Sings the Blues",
    "year": 2008,
    "src": "ia",
    "id": "Sita_Sings_the_Blues",
    "row": "Newest free movies",
    "len": "1h 22m",
    "mins": 82,
    "d": "An animated retelling of the Ramayana set to 1920s jazz."
   },
   {
    "title": "McLintock!",
    "year": 1963,
    "src": "ia",
    "id": "mclintok_widescreen",
    "row": "Family & adventure",
    "len": "2h 7m",
    "mins": 127,
    "d": "A cattle baron's chaotic family reunion in the Old West, starring John Wayne."
   },
   {
    "title": "Jungle Book",
    "year": 1942,
    "src": "ia",
    "id": "JungleBook",
    "row": "Family & adventure",
    "len": "1h 45m",
    "mins": 105,
    "d": "Mowgli, raised by wolves, returns to the human village."
   },
   {
    "title": "20,000 Leagues Under the Sea",
    "year": 1916,
    "src": "ia",
    "id": "20000LeaguesUndertheSea",
    "row": "Family & adventure",
    "len": "1h 39m",
    "mins": 99,
    "d": "Captain Nemo and his submarine, the Nautilus."
   },
   {
    "title": "Hercules Unchained",
    "year": 1959,
    "src": "ia",
    "id": "HerculesUnchained",
    "row": "Family & adventure",
    "len": "1h 36m",
    "mins": 96,
    "d": "The mighty Hercules must stop a war between two brothers."
   },
   {
    "title": "Mr. Bug Goes to Town",
    "year": 1941,
    "src": "ia",
    "id": "hoppity-goes-to-town-nta-reprint",
    "row": "Family & adventure",
    "len": "1h 18m",
    "mins": 78,
    "d": "An animated feature about a grasshopper trying to save his bug neighborhood."
   },
   {
    "title": "Daniel Boone, Trail Blazer",
    "year": 1956,
    "src": "ia",
    "id": "Daniel_Boone_-_Trail_Blazer",
    "row": "Family & adventure",
    "len": "1h 16m",
    "mins": 76,
    "d": "The frontier hero leads settlers through the wilderness to Kentucky."
   },
   {
    "title": "Jack and the Beanstalk",
    "year": 1952,
    "src": "ia",
    "id": "jackandthebeanstalk1952_202001",
    "row": "Family & adventure",
    "len": "1h 14m",
    "mins": 74,
    "d": "Abbott and Costello climb the beanstalk into a giant's castle."
   },
   {
    "title": "Gulliver's Travels",
    "year": 1939,
    "src": "ia",
    "id": "gullivers_travels1939",
    "row": "Family & adventure",
    "len": "1h 13m",
    "mins": 73,
    "d": "A shipwrecked sailor wakes up in the land of tiny people."
   },
   {
    "title": "Meet John Doe",
    "year": 1941,
    "src": "ia",
    "id": "meet_john_doe",
    "row": "Comedy",
    "len": "2h 3m",
    "mins": 123,
    "d": "A made-up letter turns an ordinary man into a national hero."
   },
   {
    "title": "My Man Godfrey",
    "year": 1936,
    "src": "ia",
    "id": "MyManGodfrey1936",
    "row": "Comedy",
    "len": "1h 35m",
    "mins": 95,
    "d": "A rich, wacky family hires a forgotten man as their butler."
   },
   {
    "title": "Royal Wedding",
    "year": 1951,
    "src": "ia",
    "id": "royalwedding1951film",
    "row": "Comedy",
    "len": "1h 33m",
    "mins": 93,
    "d": "A brother-and-sister dance team in London. Fred Astaire dances on the ceiling!"
   },
   {
    "title": "His Girl Friday",
    "year": 1940,
    "src": "ia",
    "id": "his_girl_friday",
    "row": "Comedy",
    "len": "1h 32m",
    "mins": 92,
    "d": "A fast-talking newspaper editor tries to win back his star reporter."
   },
   {
    "title": "At War with the Army",
    "year": 1950,
    "src": "ia",
    "id": "AtWarWithTheArmy",
    "row": "Comedy",
    "len": "1h 31m",
    "mins": 91,
    "d": "Martin and Lewis cause chaos at an army training camp."
   },
   {
    "title": "Topper Returns",
    "year": 1941,
    "src": "ia",
    "id": "Topper_Returns_41",
    "row": "Comedy",
    "len": "1h 28m",
    "mins": 88,
    "d": "A friendly ghost needs help solving her own mystery."
   },
   {
    "title": "Santa Claus Conquers the Martians",
    "year": 1964,
    "src": "ia",
    "id": "SantaClausConquerstheMartians1964",
    "row": "Comedy",
    "len": "1h 21m",
    "mins": 81,
    "d": "Martians kidnap Santa so their kids can have Christmas too."
   },
   {
    "title": "Africa Screams",
    "year": 1949,
    "src": "ia",
    "id": "AfricaScreams",
    "row": "Comedy",
    "len": "1h 19m",
    "mins": 79,
    "d": "Abbott and Costello bluff their way onto an African safari."
   },
   {
    "title": "Charlie Chaplin Festival",
    "year": 1938,
    "src": "ia",
    "id": "charlie_chaplin_film_fest",
    "row": "Comedy",
    "len": "1h 17m",
    "mins": 77,
    "d": "Four classic Chaplin comedy shorts in one show."
   },
   {
    "title": "Teenagers from Outer Space",
    "year": 1959,
    "src": "ia",
    "id": "teenagers_from_outerspace",
    "row": "Sci-fi & space",
    "len": "1h 25m",
    "mins": 85,
    "d": "A young alien rebels against his people's plan for Earth."
   },
   {
    "title": "The Phantom Planet",
    "year": 1961,
    "src": "ia",
    "id": "Phantom_Planet",
    "row": "Sci-fi & space",
    "len": "1h 22m",
    "mins": 82,
    "d": "An astronaut shrinks down and lands on a tiny wandering asteroid."
   },
   {
    "title": "First Spaceship on Venus",
    "year": 1960,
    "src": "ia",
    "id": "FirstSpaceshipOnVenusMPEG",
    "row": "Sci-fi & space",
    "len": "1h 19m",
    "mins": 79,
    "d": "An international crew flies to Venus after finding a mysterious message."
   },
   {
    "title": "The Lost World",
    "year": 1925,
    "src": "ia",
    "id": "lost_world",
    "row": "Sci-fi & space",
    "len": "1h 8m",
    "mins": 68,
    "d": "Explorers find a plateau where dinosaurs still live."
   },
   {
    "title": "A Trip to the Moon",
    "year": 1902,
    "src": "ia",
    "id": "ATripToTheMoon1902",
    "row": "Sci-fi & space",
    "len": "16m",
    "mins": 16,
    "d": "The first sci-fi movie ever: astronomers fly a rocket to the moon."
   },
   {
    "title": "The Phantom of the Opera",
    "year": 1925,
    "src": "ia",
    "id": "ThePhantomoftheOpera",
    "row": "Spooky night",
    "len": "1h 46m",
    "mins": 106,
    "d": "A masked figure haunts the Paris Opera House."
   },
   {
    "title": "Nosferatu",
    "year": 1922,
    "src": "ia",
    "id": "Nosferatu1922",
    "row": "Spooky night",
    "len": "1h 32m",
    "mins": 92,
    "d": "The classic silent vampire film."
   },
   {
    "title": "Carnival of Souls",
    "year": 1962,
    "src": "ia",
    "id": "CarnivalofSouls",
    "row": "Spooky night",
    "len": "1h 23m",
    "mins": 83,
    "d": "After an accident, a church organist is drawn to an abandoned carnival."
   },
   {
    "title": "House on Haunted Hill",
    "year": 1959,
    "src": "ia",
    "id": "house_on_haunted_hill_ipod",
    "row": "Spooky night",
    "len": "1h 15m",
    "mins": 75,
    "d": "Five guests are paid to spend a night in a haunted house."
   },
   {
    "title": "The Little Shop of Horrors",
    "year": 1960,
    "src": "ia",
    "id": "TheLittleShopOfHorrors1960",
    "row": "Spooky night",
    "len": "1h 13m",
    "mins": 73,
    "d": "A flower shop worker grows a plant that is always hungry."
   },
   {
    "title": "The Cabinet of Dr. Caligari",
    "year": 1920,
    "src": "ia",
    "id": "DasKabinettdesDoktorCaligariTheCabinetofDrCaligari",
    "row": "Spooky night",
    "len": "51m",
    "mins": 51,
    "d": "A strange doctor and his sleepwalker."
   },
   {
    "title": "The General",
    "year": 1926,
    "src": "ia",
    "id": "TheGeneral_201312",
    "row": "Golden-age classics",
    "len": "1h 19m",
    "mins": 79,
    "d": "Buster Keaton chases a stolen train in one of the greatest action comedies ever."
   },
   {
    "title": "Sherlock Jr.",
    "year": 1924,
    "src": "ia",
    "id": "MyMovie_20190318",
    "row": "Golden-age classics",
    "len": "44m",
    "mins": 44,
    "d": "A movie projectionist dreams himself into the film he's showing."
   },
   {
    "title": "Big Buck Bunny",
    "year": 2008,
    "src": "yt",
    "id": "aqz-KE-bpKQ",
    "row": "Animated shorts",
    "len": "10m",
    "mins": 10,
    "d": "A giant, gentle rabbit gets his revenge on three bullying rodents."
   },
   {
    "title": "Sintel",
    "year": 2010,
    "src": "yt",
    "id": "eRsGyueVLvQ",
    "row": "Animated shorts",
    "len": "15m",
    "mins": 15,
    "d": "A lonely girl searches the world for the baby dragon she raised."
   },
   {
    "title": "Tears of Steel",
    "year": 2012,
    "src": "yt",
    "id": "R6MlUcmOul8",
    "row": "Animated shorts",
    "len": "12m",
    "mins": 12,
    "d": "Warriors and scientists try to save the world from robots."
   },
   {
    "title": "Cosmos Laundromat",
    "year": 2015,
    "src": "yt",
    "id": "Y-rmzh0PI3c",
    "row": "Animated shorts",
    "len": "12m",
    "mins": 12,
    "d": "A sheep gets a chance to live a thousand different lives."
   },
   {
    "title": "Sprite Fright",
    "year": 2021,
    "src": "yt",
    "id": "_cMxraX_5RE",
    "row": "Animated shorts",
    "len": "10m",
    "mins": 10,
    "d": "Teenagers on a forest trip meet some very unfriendly mushroom sprites."
   },
   {
    "title": "Spring",
    "year": 2019,
    "src": "yt",
    "id": "WhWc3b3KhnY",
    "row": "Animated shorts",
    "len": "8m",
    "mins": 8,
    "d": "A shepherd girl and her dog face ancient spirits to bring back spring."
   },
   {
    "title": "Elephants Dream",
    "year": 2006,
    "src": "yt",
    "id": "TLkA0RELQ1g",
    "row": "Animated shorts",
    "len": "11m",
    "mins": 11,
    "d": "Two men explore a strange, endless machine."
   },
   {
    "title": "Superman: Mechanical Monsters",
    "year": 1941,
    "src": "ia",
    "id": "superman_the_mechanical_monsters",
    "row": "Animated shorts",
    "len": "10m",
    "mins": 10,
    "d": "Superman battles giant robots."
   }
  ],
};
