/* One Cast: world data shared by the game page, the economy simulator and the SQL generator.
   Everything the server needs to referee a catch (spots, species, baits, gear, prices) starts here. */
(function(root){
'use strict';
var D={};

/* ---------- Regions, in the order you reach them. ticket = one-time price, then travel is free. ---------- */
D.REGIONS=[
 {id:'home',name:'Home waters',ticket:0,tier:0,by:'bus',blurb:'Where every angler starts. Ponds, famous bass lakes and your first legends.',color:'#5CF08A'},
 {id:'northwoods',name:'Northwoods',ticket:1000,tier:1,by:'bus',blurb:'Ice holes on huge frozen lakes. Walleye, pike and the first muskies.',color:'#9FD3F2'},
 {id:'greatlakes',name:'Great Lakes',ticket:2500,tier:2,by:'bus',blurb:'Inland seas. Lake trout, salmon and sturgeon in deep cold water.',color:'#6FA9D8'},
 {id:'mississippi',name:'Mississippi River',ticket:5000,tier:3,by:'bus',blurb:'Muddy backwaters full of giant catfish and alligator gar.',color:'#C9A06A'},
 {id:'everglades',name:'Everglades',ticket:8000,tier:4,by:'plane',blurb:'Mangroves and sawgrass. Peacock bass, snook, tarpon and a swamp legend.',color:'#8CC63F'},
 {id:'keys',name:'Florida Keys and Gulf',ticket:12000,tier:5,by:'plane',blurb:'Turquoise flats and offshore reefs. Your first saltwater giants.',color:'#46D8D0'},
 {id:'pnw',name:'Pacific Northwest and Alaska',ticket:20000,tier:6,by:'plane',blurb:'Salmon rivers, monster sturgeon and barn-door halibut.',color:'#7FB8A4'},
 {id:'pacific',name:'Pacific and Hawaii',ticket:35000,tier:7,by:'plane',blurb:'Open blue water. Troll for tuna, mahi-mahi and blue marlin.',color:'#2F84D8'},
 {id:'amazon',name:'Amazon',ticket:80000,tier:8,by:'plane',blurb:'Flooded forest. Arapaima, piranha and whiskered giants.',color:'#4CAF50'},
 {id:'africa',name:'Africa',ticket:100000,tier:9,by:'plane',blurb:'Lake Victoria and the Zambezi. Nile perch and razor-toothed tigerfish.',color:'#E0A040'},
 {id:'eurasia',name:'Europe and Asia',ticket:100000,tier:10,by:'plane',blurb:'From Spanish rivers to Mongolian taimen and Thai giant carp.',color:'#B08CE0'},
 {id:'australia',name:'Australia',ticket:120000,tier:11,by:'plane',blurb:'Murray cod inland, barramundi and coral trout on the reef.',color:'#F0784A'},
 {id:'arctic',name:'Arctic Ocean',ticket:250000,tier:12,by:'charter',blurb:'The Greenland ice edge. Centuries-old sharks in the dark.',color:'#DDE6EC'},
 {id:'southern',name:'Southern Ocean',ticket:500000,tier:13,by:'charter',blurb:'The Ross Sea. The deepest, coldest water on Earth.',color:'#A0C8F0'}
];

/* ---------- Spots. method: ice | shore | boat | troll | deep. tz: IANA zone used for dawn, day, dusk and night at that spot.
   scene: a palette and backdrop for the pixel scene. lat/lon place the pin on the world map. ---------- */
D.SPOTS=[
 /* Home waters */
 {id:'basslake',region:'home',name:'Bass Lake',method:'shore',tz:'America/New_York',lat:41.2,lon:-75.9,scene:'pond',famous:false,desc:'A quiet lake near home. Bluegill, bass, crappie and catfish.'},
 {id:'farmpond',region:'home',name:'Farm Pond',method:'shore',tz:'America/New_York',lat:40.6,lon:-77.4,scene:'farm',desc:'A muddy farm pond with a dock. Fast bites, small fish, and the odd big catfish.'},
 {id:'walden',region:'home',name:'Walden Pond',method:'shore',tz:'America/New_York',lat:42.44,lon:-71.34,scene:'woods',famous:true,where:'Massachusetts',known:'Thoreau\'s famous pond, stocked with trout',desc:'Clear, deep and quiet. Trout and smallmouth.'},
 {id:'harlemmeer',region:'home',name:'Harlem Meer',method:'shore',tz:'America/New_York',lat:40.80,lon:-73.95,scene:'city',famous:true,where:'Central Park, New York City',known:'Catch-and-release fishing in the middle of the city',desc:'Skyscrapers behind you, carp and bass in front of you.'},
 {id:'lakefork',region:'home',name:'Lake Fork',method:'shore',tz:'America/Chicago',lat:32.83,lon:-95.58,scene:'south',famous:true,where:'Texas',known:'Trophy largemouth bass',desc:'The most famous big-bass lake in Texas.'},
 {id:'guntersville',region:'home',name:'Lake Guntersville',method:'shore',tz:'America/Chicago',lat:34.4,lon:-86.3,scene:'south',famous:true,where:'Alabama',known:'Big bass tournaments',desc:'Grass mats and heavy bass.'},
 {id:'lanier',region:'home',name:'Lake Lanier',method:'shore',tz:'America/New_York',lat:34.25,lon:-83.95,scene:'south',famous:true,where:'Georgia',known:'Striped bass',desc:'Deep clear water. Striped and spotted bass.'},
 {id:'clearlake',region:'home',name:'Clear Lake',method:'shore',tz:'America/Los_Angeles',lat:39.0,lon:-122.8,scene:'west',famous:true,where:'California',known:'Big largemouth bass',desc:'Old, rich water with huge bass and catfish.'},
 {id:'basslakeca',region:'home',name:'Bass Lake (California)',method:'shore',tz:'America/Los_Angeles',lat:37.32,lon:-119.57,scene:'mountain',famous:true,where:'California',known:'Trout and bass near Yosemite',desc:'Pines and granite. Rainbow trout, kokanee and bass.'},
 {id:'bigbear',region:'home',name:'Big Bear Lake',method:'shore',tz:'America/Los_Angeles',lat:34.24,lon:-116.9,scene:'mountain',famous:true,where:'California',known:'Mountain trout',desc:'High in the mountains. Rainbow trout and crappie.'},
 /* Northwoods */
 {id:'lakeofthewoods',region:'northwoods',name:'Lake of the Woods',method:'ice',tz:'America/Winnipeg',lat:49.3,lon:-94.8,scene:'ice_pines',desc:'Walleye capital of the world. Ice shacks for miles.'},
 {id:'millelacs',region:'northwoods',name:'Mille Lacs',method:'ice',tz:'America/Chicago',lat:46.2,lon:-93.6,scene:'ice_pines',desc:'Giant muskie and walleye under thick ice.'},
 {id:'minnetonka',region:'northwoods',name:'Lake Minnetonka',method:'ice',tz:'America/Chicago',lat:44.93,lon:-93.6,scene:'ice_city',famous:true,where:'Minnesota',known:'Muskie, right outside Minneapolis',desc:'Ice fishing with the city skyline behind you.'},
 {id:'winnebago',region:'northwoods',name:'Lake Winnebago',method:'ice',tz:'America/Chicago',lat:44.0,lon:-88.4,scene:'ice_pines',famous:true,where:'Wisconsin',known:'Lake sturgeon',desc:'Home of the famous sturgeon spearing season.'},
 {id:'devilslake',region:'northwoods',name:'Devils Lake',method:'ice',tz:'America/Chicago',lat:48.05,lon:-98.9,scene:'ice_flat',famous:true,where:'North Dakota',known:'Jumbo perch through the ice',desc:'Flat, windy and full of jumbo perch.'},
 {id:'simcoe',region:'northwoods',name:'Lake Simcoe',method:'ice',tz:'America/Toronto',lat:44.4,lon:-79.35,scene:'ice_pines',famous:true,where:'Ontario, Canada',known:'Ice fishing for perch, whitefish and lake trout',desc:'Canada\'s ice fishing capital.'},
 /* Great Lakes */
 {id:'superior',region:'greatlakes',name:'Lake Superior',method:'ice',tz:'America/Chicago',lat:47.3,lon:-89.5,scene:'ice_cliffs',desc:'The biggest, coldest Great Lake. Lake trout and sturgeon.'},
 {id:'michigan',region:'greatlakes',name:'Lake Michigan',method:'boat',tz:'America/Chicago',lat:43.5,lon:-87.0,scene:'bigwater',desc:'Chinook salmon and smallmouth from a small boat.'},
 /* Mississippi */
 {id:'mississippi',region:'mississippi',name:'Lower Mississippi backwaters',method:'boat',tz:'America/Chicago',lat:33.5,lon:-91.1,scene:'river',desc:'Brown water, cypress knees and catfish the size of people.'},
 /* Everglades */
 {id:'everglades',region:'everglades',name:'Everglades backcountry',method:'boat',tz:'America/New_York',lat:25.4,lon:-80.9,scene:'swamp',desc:'Mangrove tunnels and sawgrass. Snook, tarpon and the Swamp King.'},
 {id:'okeechobee',region:'everglades',name:'Lake Okeechobee',method:'shore',tz:'America/New_York',lat:26.95,lon:-80.8,scene:'swamp',desc:'Florida\'s big lake. Giant bass and peacock bass in the canals.'},
 /* Keys and Gulf */
 {id:'keysflats',region:'keys',name:'Keys flats',method:'boat',tz:'America/New_York',lat:24.7,lon:-81.1,scene:'flats',desc:'Ankle-deep turquoise water. Bonefish, permit and tarpon.'},
 {id:'gulfreefs',region:'keys',name:'Gulf reefs',method:'boat',tz:'America/Chicago',lat:28.0,lon:-88.5,scene:'offshore',desc:'Wrecks and reefs offshore. Snapper, barracuda and goliath grouper.'},
 /* PNW and Alaska */
 {id:'columbia',region:'pnw',name:'Columbia River',method:'shore',tz:'America/Los_Angeles',lat:45.65,lon:-121.9,scene:'river_mountain',desc:'Salmon, steelhead and white sturgeon as long as a canoe.'},
 {id:'kenai',region:'pnw',name:'Kenai River',method:'boat',tz:'America/Anchorage',lat:60.5,lon:-150.9,scene:'river_mountain',desc:'Glacier-blue water and the biggest king salmon on Earth.'},
 {id:'gulfofalaska',region:'pnw',name:'Gulf of Alaska',method:'deep',tz:'America/Anchorage',lat:58.0,lon:-148.0,scene:'coldsea',desc:'Drop a bait 300 feet down for halibut and lingcod.'},
 /* Pacific */
 {id:'kona',region:'pacific',name:'Kona coast',method:'troll',tz:'Pacific/Honolulu',lat:19.6,lon:-156.2,scene:'tropic_sea',desc:'Volcanoes behind you, blue marlin in front of you.'},
 {id:'openpacific',region:'pacific',name:'Open Pacific',method:'troll',tz:'Etc/GMT+11',lat:12.0,lon:-165.0,scene:'open_sea',desc:'No land in sight. Tuna, wahoo and mahi-mahi.'},
 /* Amazon */
 {id:'rionegro',region:'amazon',name:'Rio Negro',method:'boat',tz:'America/Manaus',lat:-1.5,lon:-62.0,scene:'jungle_river',desc:'Black water, pink dolphins and peacock bass.'},
 {id:'floodedforest',region:'amazon',name:'Flooded forest',method:'shore',tz:'America/Manaus',lat:-3.2,lon:-64.5,scene:'jungle',desc:'Fish between the trees for arapaima and redtail catfish.'},
 /* Africa */
 {id:'victoria',region:'africa',name:'Lake Victoria',method:'boat',tz:'Africa/Nairobi',lat:-1.0,lon:33.0,scene:'savanna_lake',desc:'The biggest lake in Africa and its giant Nile perch.'},
 {id:'zambezi',region:'africa',name:'Zambezi River',method:'shore',tz:'Africa/Harare',lat:-17.9,lon:25.8,scene:'savanna_river',desc:'Tigerfish with teeth like a saw, and vundu in the deep holes.'},
 /* Europe and Asia */
 {id:'ebro',region:'eurasia',name:'Ebro River',method:'shore',tz:'Europe/Madrid',lat:41.1,lon:0.5,scene:'europe_river',desc:'Spain\'s river of giant wels catfish and carp.'},
 {id:'lochness',region:'eurasia',name:'Loch Ness',method:'shore',tz:'Europe/London',lat:57.3,lon:-4.45,scene:'loch',famous:true,where:'Scotland',known:'Brown trout, salmon, and a famous legend',desc:'Deep, dark and cold. Something lives down there.'},
 {id:'mongolia',region:'eurasia',name:'Mongolian rivers',method:'shore',tz:'Asia/Ulaanbaatar',lat:49.5,lon:101.5,scene:'steppe_river',desc:'Wild rivers and taimen, the biggest trout on Earth.'},
 {id:'thaipark',region:'eurasia',name:'Thai fishing park',method:'shore',tz:'Asia/Bangkok',lat:13.8,lon:100.4,scene:'thai',desc:'Giant carp and giant catfish right next to the city.'},
 {id:'biwa',region:'eurasia',name:'Lake Biwa',method:'shore',tz:'Asia/Tokyo',lat:35.3,lon:136.1,scene:'japan',famous:true,where:'Japan',known:'A largemouth bass that tied the world record',desc:'Japan\'s biggest lake and its record bass.'},
 /* Australia */
 {id:'murray',region:'australia',name:'Murray River',method:'shore',tz:'Australia/Sydney',lat:-34.2,lon:142.1,scene:'outback_river',desc:'Red gum trees and Murray cod the size of dogs.'},
 {id:'gbr',region:'australia',name:'Great Barrier Reef',method:'boat',tz:'Australia/Brisbane',lat:-18.3,lon:147.7,scene:'reef',desc:'Coral trout, barramundi in the estuaries and giant trevally.'},
 /* Arctic */
 {id:'greenland',region:'arctic',name:'Greenland ice edge',method:'ice',tz:'America/Nuuk',lat:69.2,lon:-51.1,scene:'ice_arctic',desc:'Fish through sea ice for char, cod and halibut under the northern lights.'},
 {id:'arcticdeep',region:'arctic',name:'Arctic deep',method:'deep',tz:'America/Nuuk',lat:72.0,lon:-58.0,scene:'ice_sea',desc:'Hundreds of feet down. Home of The Leviathan.'},
 /* Southern */
 {id:'rosssea',region:'southern',name:'Ross Sea, Antarctica',method:'deep',tz:'Antarctica/McMurdo',lat:-75.0,lon:175.0,scene:'antarctic',desc:'The end of the world. Toothfish from the black water.'}
];

/* ---------- Baits. Bought once, used forever. tau = minutes until the size cap is nearly reached,
   capMax = fraction of a species' top weight this bait can reach, biteMean = average wait in minutes. ---------- */
D.BAITS=[
 {id:'worm',name:'Worms',price:0,tau:10,capMax:0.35,minBite:0.15,biteMean:1,rate:'HIGH',water:'fresh',desc:'Lots of bites, tiny fish',timing:'Bites come fast, about once a minute. Only small fish though.'},
 {id:'minnow',name:'Minnows',price:60,tau:150,capMax:1,minBite:8,biteMean:15,rate:'OK',water:'fresh',desc:'Bass, walleye, trout',timing:'A bite every 20 minutes or so. Later bites bring bigger fish.'},
 {id:'cut',name:'Cut bait',price:400,tau:360,capMax:1,minBite:5,biteMean:120,rate:'LOW',water:'fresh',desc:'Catfish and bottom feeders',timing:'A bite every 2 hours or so. Later bites bring bigger fish.'},
 {id:'sucker',name:'Suckers',price:1500,tau:720,capMax:1,minBite:10,biteMean:360,rate:'VERY LOW',water:'fresh',desc:'Rare bites, giant fish',timing:'A bite every 6 hours or so. Giants only bite late.'},
 {id:'shrimp',name:'Live shrimp',price:4000,tau:60,capMax:0.6,minBite:3,biteMean:12,rate:'HIGH',water:'salt',desc:'Fast saltwater action',timing:'Steady bites every 15 minutes. Inshore fish, medium size.'},
 {id:'squid',name:'Squid',price:12000,tau:300,capMax:1,minBite:10,biteMean:90,rate:'OK',water:'salt',desc:'Reef and bottom fish',timing:'A bite every hour or two. Snapper, grouper, cod and halibut.'},
 {id:'mullet',name:'Live mullet',price:30000,tau:600,capMax:1,minBite:15,biteMean:240,rate:'LOW',water:'salt',desc:'Big inshore predators',timing:'A bite every 4 hours. Tarpon, snook, barracuda and giants.'},
 {id:'lure',name:'Trolling lures',price:80000,tau:240,capMax:1,minBite:10,biteMean:60,rate:'OK',water:'troll',desc:'Tuna, marlin, mahi-mahi',timing:'A strike every hour or so while the boat trolls. The longer the troll, the bigger the fish.'},
 {id:'deepbait',name:'Deep-drop rig',price:200000,tau:900,capMax:1,minBite:20,biteMean:480,rate:'VERY LOW',water:'deep',desc:'Bottom monsters',timing:'A bite every 8 hours. The things that live in the dark are enormous.'}
];
/* Which baits each method can use. */
D.METHOD_BAITS={ice:['worm','minnow','cut','sucker'],shore:['worm','minnow','cut','sucker','shrimp','mullet'],boat:['worm','minnow','cut','sucker','shrimp','squid','mullet'],troll:['worm','minnow','cut','shrimp','squid','lure'],deep:['worm','minnow','cut','sucker','shrimp','squid','deepbait']};
D.METHOD_NAME={ice:'Ice hole',shore:'Shore',boat:'Small boat',troll:'Ocean trolling',deep:'Deep drop'};
/* Gear needed to fish each method. */
D.METHOD_GEAR={ice:null,shore:null,boat:null,troll:null,deep:'deeprig'};
/* Open-water spots you can fish without the big gear. Without it you fish plain bait over the side and only small sea fish bite. */
D.OPEN_WATER={troll:1,deep:1};
/* Baits that only work with special gear. */
D.BAIT_GEAR={deepbait:'deeprig'};
D.BAIT_BOAT={lure:5};
D.CREW_BONUS=0.9; D.CREW_MAX=3;
/* What kind of water each spot is, and which boat level you need to fish it. */
var SALT={everglades:1,keysflats:1,gulfreefs:1,gbr:1}, WATER_OF={kona:'troll',openpacific:'troll',gulfofalaska:'deep',arcticdeep:'deep',rosssea:'deep',greenland:'polar'};
D.SPOTS.forEach(function(s){ s.water=WATER_OF[s.id]||(SALT[s.id]?'salt':'fresh'); s.need=s.method==='boat'?(s.water==='salt'?2:1):s.method==='troll'?5:0; });

/* ---------- Activity by time of day. Dawn and dusk double the trophy chance for every fish. ---------- */
D.ACT_PROFILES={
 panfish:{dawn:1.3,day:1.4,dusk:1.1,night:0.3},
 bass:{dawn:2,day:0.8,dusk:2,night:0.6},
 lowlight:{dawn:1.5,day:0.4,dusk:2.5,night:2.2},
 day:{dawn:1.2,day:1.8,dusk:0.8,night:0.3},
 night:{dawn:0.8,day:0.3,dusk:1.3,night:3},
 trout:{dawn:1.8,day:1.2,dusk:1.2,night:0.4},
 any:{dawn:1.2,day:1,dusk:1.2,night:0.9},
 deep:{dawn:1,day:1,dusk:1,night:1.2}
};
D.PERIOD_NAME={dawn:'Dawn',day:'Day',dusk:'Dusk',night:'Night'};
D.periodOf=function(h){ if(h==null) return null; h=((h%24)+24)%24; return h>=5&&h<8?'dawn':h>=8&&h<17?'day':h>=17&&h<20?'dusk':'night'; };

/* ---------- Species. min/max in pounds, k turns pounds into inches, rate is dollars per pound.
   spots: how common the fish is at each spot. baits: how much it likes each bait. minWait: minutes before it can bite. ---------- */
var S=[];
function sp(o){ S.push(o); return o; }
/* freshwater, North America */
sp({id:'bluegill',name:'Bluegill',min:0.1,max:2.5,k:11,rate:27,act:'panfish',look:'bluegill',minWait:0,maxWait:120,baits:{worm:4,minnow:0.15},spots:{basslake:5,farmpond:6,harlemmeer:3,lakefork:2,guntersville:2,clearlake:2,okeechobee:2,bigbear:1}});
sp({id:'pumpkinseed',name:'Pumpkinseed',min:0.1,max:1.5,k:10.5,rate:30,act:'panfish',look:'pumpkinseed',minWait:0,maxWait:120,baits:{worm:3},spots:{basslake:3,farmpond:3,walden:3,harlemmeer:2}});
sp({id:'perch',name:'Yellow perch',min:0.2,max:3,k:12,rate:24,act:'panfish',look:'perch',minWait:0,maxWait:240,baits:{worm:4,minnow:0.4,cut:0.3},spots:{basslake:3,walden:1,lakeofthewoods:3,millelacs:3,minnetonka:3,devilslake:8,simcoe:6,winnebago:2,superior:1}});
sp({id:'crappie',name:'Black crappie',min:0.3,max:4.5,k:12.5,rate:21,act:'lowlight',look:'crappie',minWait:1,maxWait:480,baits:{worm:2.5,minnow:1},spots:{basslake:3,farmpond:2,lakefork:3,guntersville:2,bigbear:3,okeechobee:4,clearlake:3,minnetonka:2}});
sp({id:'largemouth',name:'Largemouth bass',min:0.5,max:22,k:11.6,rate:18,act:'bass',look:'largemouth',minWait:15,maxWait:900,baits:{minnow:4,cut:0.5,sucker:0.5},spots:{basslake:4,farmpond:2,harlemmeer:3,lakefork:8,guntersville:7,lanier:2,clearlake:7,basslakeca:2,okeechobee:6,everglades:2,biwa:5,minnetonka:3}});
sp({id:'smallmouth',name:'Smallmouth bass',min:0.5,max:11,k:12,rate:21,act:'day',look:'smallmouth',minWait:20,maxWait:1200,baits:{minnow:3,cut:0.5,sucker:0.3},spots:{basslake:1,walden:4,lanier:1,simcoe:2,superior:2,michigan:5,millelacs:3}});
sp({id:'spotted',name:'Spotted bass',min:0.5,max:10,k:11.8,rate:21,act:'day',look:'spotted',minWait:15,maxWait:900,baits:{minnow:4,cut:0.3},spots:{lanier:6,guntersville:2}});
sp({id:'striper',name:'Striped bass',min:2,max:70,k:13.5,rate:8,act:'lowlight',look:'striper',minWait:40,maxWait:0,baits:{minnow:3,cut:2,sucker:3},spots:{lanier:4,harlemmeer:0.5,columbia:1}});
sp({id:'carp',name:'Common carp',min:2,max:60,k:13,rate:6,act:'day',look:'carp',minWait:20,maxWait:0,baits:{worm:2,cut:3},spots:{harlemmeer:6,farmpond:2,clearlake:2,ebro:3,biwa:2,thaipark:1}});
sp({id:'channel',name:'Channel catfish',min:1,max:50,k:14.4,rate:9,act:'night',look:'channel',minWait:30,maxWait:0,baits:{minnow:0.5,cut:6,sucker:1},spots:{basslake:2,farmpond:4,lakefork:2,clearlake:4,mississippi:3,okeechobee:2}});
sp({id:'bluecat',name:'Blue catfish',min:5,max:140,k:14,rate:24,act:'night',look:'bluecat',minWait:120,maxWait:0,baits:{cut:5,sucker:4},spots:{mississippi:5,lakefork:1}});
sp({id:'flathead',name:'Flathead catfish',min:5,max:120,k:14.5,rate:24,act:'night',look:'flathead',minWait:180,maxWait:0,baits:{cut:2,sucker:5},spots:{mississippi:5,guntersville:1}});
sp({id:'walleye',name:'Walleye',min:1,max:22,k:14,rate:28,act:'lowlight',look:'walleye',minWait:30,maxWait:1500,baits:{minnow:5,cut:1,sucker:0.5},spots:{lakeofthewoods:8,millelacs:6,devilslake:4,minnetonka:3,winnebago:4,simcoe:1}});
sp({id:'pike',name:'Northern pike',min:2,max:50,k:15.8,rate:17,act:'day',look:'pike',minWait:60,maxWait:0,baits:{minnow:4,cut:0.5,sucker:3},spots:{lakeofthewoods:4,millelacs:3,devilslake:3,minnetonka:3,simcoe:2,superior:1,winnebago:1}});
sp({id:'muskie',name:'Muskellunge',min:8,max:65,k:16.2,rate:28,act:'bass',look:'muskie',minWait:240,maxWait:0,baits:{sucker:6},spots:{millelacs:4,minnetonka:5,lakeofthewoods:2,simcoe:0.5}});
sp({id:'cisco',name:'Cisco',min:0.3,max:6,k:12,rate:17,act:'trout',look:'cisco',minWait:1,maxWait:300,baits:{worm:3,minnow:1},spots:{lakeofthewoods:3,millelacs:2,simcoe:2,superior:3}});
sp({id:'whitefish',name:'Lake whitefish',min:1,max:14,k:12.5,rate:20,act:'trout',look:'whitefish',minWait:20,maxWait:0,baits:{worm:1.5,minnow:3},spots:{simcoe:5,superior:3,winnebago:2,greenland:1}});
sp({id:'laketrout',name:'Lake trout',min:2,max:70,k:14.4,rate:24,act:'trout',look:'laketrout',minWait:120,maxWait:0,baits:{minnow:2,cut:3,sucker:2},spots:{superior:7,simcoe:3,michigan:2,greenland:0.5}});
sp({id:'burbot',name:'Burbot',min:1,max:22,k:16,rate:18,act:'night',look:'burbot',minWait:60,maxWait:0,baits:{minnow:2,cut:5,sucker:3},spots:{superior:4,lakeofthewoods:2,devilslake:1}});
sp({id:'chinook',name:'Chinook salmon',min:5,max:95,k:13.5,rate:52,act:'trout',look:'chinook',minWait:120,maxWait:0,baits:{minnow:3,cut:4,sucker:1},spots:{michigan:6,columbia:5,kenai:8}});
sp({id:'coho',name:'Coho salmon',min:3,max:30,k:13.6,rate:47,act:'trout',look:'coho',minWait:40,maxWait:0,baits:{minnow:4,cut:2},spots:{michigan:4,columbia:3,kenai:5}});
sp({id:'steelhead',name:'Steelhead',min:3,max:40,k:13.8,rate:57,act:'trout',look:'steelhead',minWait:60,maxWait:0,baits:{minnow:4,cut:2},spots:{columbia:6,kenai:2,michigan:1}});
sp({id:'rainbow',name:'Rainbow trout',min:0.5,max:25,k:13,rate:18,act:'trout',look:'rainbow',minWait:15,maxWait:0,baits:{minnow:4,cut:0.3},spots:{walden:5,basslakeca:5,bigbear:7}});
sp({id:'brown',name:'Brown trout',min:1,max:40,k:13.4,rate:24,act:'lowlight',look:'brown',minWait:30,maxWait:0,baits:{minnow:4,cut:0.5},spots:{walden:2,lochness:6,bigbear:1}});
sp({id:'kokanee',name:'Kokanee salmon',min:0.5,max:6,k:12.7,rate:15,act:'day',look:'kokanee',minWait:2,maxWait:360,baits:{worm:3,minnow:1},spots:{basslakeca:4}});
sp({id:'lakesturgeon',name:'Lake sturgeon',min:20,max:240,k:16.3,rate:24,act:'night',look:'sturgeon',minWait:600,maxWait:0,baits:{cut:1.5,sucker:3},spots:{winnebago:5,superior:3,lakeofthewoods:1}});
sp({id:'whitesturgeon',name:'White sturgeon',min:30,max:1100,k:16,rate:36,act:'night',look:'sturgeon',minWait:720,maxWait:0,baits:{cut:2,sucker:4},spots:{columbia:4}});
sp({id:'gar',name:'Alligator gar',min:20,max:300,k:17,rate:30,act:'day',look:'gar',minWait:300,maxWait:0,baits:{cut:4,sucker:3},spots:{mississippi:4}});
sp({id:'drum',name:'Freshwater drum',min:2,max:50,k:13,rate:17,act:'any',look:'drum',minWait:20,maxWait:0,baits:{cut:4,minnow:1},spots:{mississippi:5,winnebago:2}});
sp({id:'bowfin',name:'Bowfin',min:2,max:20,k:14.5,rate:8,act:'day',look:'bowfin',minWait:30,maxWait:0,baits:{minnow:2,cut:4},spots:{everglades:3,okeechobee:3,mississippi:1}});
sp({id:'floridagar',name:'Florida gar',min:2,max:20,k:17,rate:9,act:'day',look:'floridagar',minWait:30,maxWait:0,baits:{minnow:3,cut:3},spots:{everglades:4,okeechobee:3}});
sp({id:'peacock',name:'Peacock bass',min:1,max:28,k:12,rate:45,act:'day',look:'peacock',minWait:20,maxWait:900,baits:{minnow:5,cut:0.5},spots:{okeechobee:5,everglades:3,rionegro:8,floodedforest:4}});
/* salt and brackish */
sp({id:'snook',name:'Snook',min:3,max:55,k:14.5,rate:40,act:'lowlight',look:'snook',minWait:40,maxWait:0,baits:{shrimp:4,mullet:5,minnow:1},spots:{everglades:6,okeechobee:1,keysflats:2}});
sp({id:'tarpon',name:'Tarpon',min:20,max:280,k:14.5,rate:0,protected:true,act:'lowlight',look:'tarpon',minWait:240,maxWait:0,baits:{mullet:5,shrimp:0.5},spots:{everglades:3,keysflats:5}});
sp({id:'bonefish',name:'Bonefish',min:2,max:18,k:13.5,rate:70,act:'day',look:'bonefish',minWait:20,maxWait:600,baits:{shrimp:6},spots:{keysflats:8}});
sp({id:'permit',name:'Permit',min:5,max:55,k:12,rate:85,act:'day',look:'permit',minWait:60,maxWait:0,baits:{shrimp:3},spots:{keysflats:4}});
sp({id:'barracuda',name:'Great barracuda',min:5,max:85,k:16,rate:36,act:'day',look:'barracuda',minWait:60,maxWait:0,baits:{mullet:5,squid:1,shrimp:0.5},spots:{gulfreefs:4,keysflats:3,kona:1}});
sp({id:'snapper',name:'Red snapper',min:2,max:50,k:12.8,rate:54,act:'any',look:'snapper',minWait:30,maxWait:0,baits:{squid:6,shrimp:3,mullet:1},spots:{gulfreefs:8}});
sp({id:'goliath',name:'Goliath grouper',min:50,max:700,k:12.5,rate:0,protected:true,act:'any',look:'goliath',minWait:360,maxWait:0,baits:{mullet:4,squid:2},spots:{gulfreefs:3}});
sp({id:'halibut',name:'Pacific halibut',min:10,max:500,k:13.5,rate:78,act:'deep',look:'halibut',minWait:240,maxWait:0,baits:{squid:5,deepbait:5},spots:{gulfofalaska:7}});
sp({id:'lingcod',name:'Lingcod',min:5,max:80,k:14,rate:91,act:'deep',look:'lingcod',minWait:60,maxWait:0,baits:{squid:6,deepbait:2},spots:{gulfofalaska:6}});
sp({id:'yellowfin',name:'Yellowfin tuna',min:20,max:400,k:12.6,rate:60,act:'day',look:'yellowfin',minWait:60,maxWait:0,baits:{lure:6},spots:{openpacific:7,kona:4}});
sp({id:'bluefin',name:'Pacific bluefin tuna',min:50,max:1000,k:12.5,rate:90,act:'day',look:'bluefin',minWait:300,maxWait:0,baits:{lure:3},spots:{openpacific:3}});
sp({id:'marlin',name:'Blue marlin',min:150,max:1800,k:14,rate:80,act:'day',look:'marlin',minWait:360,maxWait:0,baits:{lure:3},spots:{kona:5,openpacific:2}});
sp({id:'mahi',name:'Mahi-mahi',min:5,max:85,k:13.5,rate:55,act:'day',look:'mahi',minWait:15,maxWait:600,baits:{lure:8},spots:{kona:7,openpacific:6}});
sp({id:'wahoo',name:'Wahoo',min:10,max:180,k:15.5,rate:65,act:'day',look:'wahoo',minWait:40,maxWait:0,baits:{lure:4},spots:{openpacific:4,kona:2}});
sp({id:'gt',name:'Giant trevally',min:10,max:180,k:12.5,rate:74,act:'day',look:'gt',minWait:60,maxWait:0,baits:{mullet:4,lure:2,squid:1},spots:{kona:2,gbr:6}});
/* Amazon */
sp({id:'arapaima',name:'Arapaima',min:20,max:480,k:15.5,rate:260,act:'night',look:'arapaima',minWait:360,maxWait:0,baits:{cut:3,sucker:5},spots:{floodedforest:5,rionegro:2}});
sp({id:'piranha',name:'Red-bellied piranha',min:0.5,max:8,k:11,rate:130,act:'day',look:'piranha',minWait:2,maxWait:300,baits:{cut:6,worm:2,minnow:2},spots:{floodedforest:6,rionegro:5}});
sp({id:'redtail',name:'Redtail catfish',min:10,max:130,k:13.8,rate:185,act:'night',look:'redtail',minWait:180,maxWait:0,baits:{cut:5,sucker:4},spots:{rionegro:5,floodedforest:3,thaipark:3}});
sp({id:'payara',name:'Payara',min:2,max:40,k:14.5,rate:240,act:'lowlight',look:'payara',minWait:30,maxWait:0,baits:{minnow:4,cut:3},spots:{rionegro:5,floodedforest:2}});
/* Africa */
sp({id:'nileperch',name:'Nile perch',min:10,max:500,k:13.2,rate:105,act:'lowlight',look:'nileperch',minWait:240,maxWait:0,baits:{cut:3,sucker:5},spots:{victoria:7}});
sp({id:'tigerfish',name:'Tigerfish',min:5,max:70,k:14,rate:135,act:'day',look:'tigerfish',minWait:40,maxWait:0,baits:{cut:5,minnow:1},spots:{zambezi:8,victoria:1}});
sp({id:'vundu',name:'Vundu catfish',min:10,max:120,k:14.5,rate:94,act:'night',look:'vundu',minWait:240,maxWait:0,baits:{cut:4,sucker:5},spots:{zambezi:4}});
/* Europe and Asia */
sp({id:'wels',name:'Wels catfish',min:20,max:300,k:15,rate:65,act:'night',look:'wels',minWait:360,maxWait:0,baits:{cut:3,sucker:5},spots:{ebro:7}});
sp({id:'atlanticsalmon',name:'Atlantic salmon',min:5,max:80,k:13.6,rate:79,act:'trout',look:'atlanticsalmon',minWait:120,maxWait:0,baits:{minnow:4,cut:1},spots:{lochness:4}});
sp({id:'eel',name:'European eel',min:2,max:25,k:20,rate:43,act:'night',look:'eel',minWait:60,maxWait:0,baits:{cut:4},spots:{lochness:3,ebro:1}});
sp({id:'taimen',name:'Taimen',min:10,max:230,k:15,rate:86,act:'trout',look:'taimen',minWait:300,maxWait:0,baits:{minnow:2,cut:3,sucker:5},spots:{mongolia:7}});
sp({id:'lenok',name:'Lenok',min:1,max:15,k:13.5,rate:65,act:'trout',look:'lenok',minWait:15,maxWait:600,baits:{worm:3,minnow:4},spots:{mongolia:6}});
sp({id:'siamesecarp',name:'Siamese giant carp',min:20,max:300,k:12.8,rate:58,act:'day',look:'siamesecarp',minWait:240,maxWait:0,baits:{cut:4},spots:{thaipark:6}});
sp({id:'mekong',name:'Mekong giant catfish',min:50,max:650,k:13.5,rate:0,protected:true,act:'night',look:'mekong',minWait:480,maxWait:0,baits:{cut:2,sucker:4},spots:{thaipark:3}});
sp({id:'biwatrout',name:'Biwa trout',min:1,max:20,k:13.5,rate:72,act:'trout',look:'biwatrout',minWait:30,maxWait:0,baits:{minnow:5},spots:{biwa:5}});
/* Australia */
sp({id:'murraycod',name:'Murray cod',min:10,max:250,k:13.5,rate:135,act:'night',look:'murraycod',minWait:300,maxWait:0,baits:{cut:3,sucker:5,minnow:1},spots:{murray:7}});
sp({id:'goldenperch',name:'Golden perch',min:1,max:25,k:12.5,rate:110,act:'lowlight',look:'goldenperch',minWait:20,maxWait:600,baits:{minnow:4},spots:{murray:6}});
sp({id:'barramundi',name:'Barramundi',min:5,max:100,k:13.5,rate:135,act:'lowlight',look:'barramundi',minWait:60,maxWait:0,baits:{shrimp:3,mullet:5,minnow:2},spots:{gbr:6}});
sp({id:'coraltrout',name:'Coral trout',min:3,max:55,k:12.8,rate:160,act:'day',look:'coraltrout',minWait:30,maxWait:0,baits:{squid:6,shrimp:3,mullet:1},spots:{gbr:7}});
/* Arctic */
sp({id:'char',name:'Arctic char',min:1,max:32,k:14,rate:240,act:'trout',look:'char',minWait:30,maxWait:0,baits:{minnow:5,cut:2},spots:{greenland:7}});
sp({id:'cod',name:'Atlantic cod',min:5,max:210,k:13.4,rate:190,act:'deep',look:'cod',minWait:60,maxWait:0,baits:{cut:3,squid:6,deepbait:2},spots:{greenland:4,arcticdeep:5}});
sp({id:'greenlandhalibut',name:'Greenland halibut',min:5,max:100,k:13.5,rate:255,act:'deep',look:'ghalibut',minWait:120,maxWait:0,baits:{squid:4,deepbait:5,cut:1},spots:{greenland:2,arcticdeep:6}});
sp({id:'greenlandshark',name:'Greenland shark',min:300,max:2200,k:15,rate:0,protected:true,act:'deep',look:'greenlandshark',minWait:600,maxWait:0,baits:{deepbait:5},spots:{arcticdeep:3}});
/* extras so every spot has company */
sp({id:'tilapia',name:'Nile tilapia',min:0.5,max:10,k:11.5,rate:48,act:'day',look:'tilapia',minWait:1,maxWait:300,baits:{worm:5,cut:1},spots:{victoria:6,zambezi:2,thaipark:2}});
sp({id:'sharptooth',name:'Sharptooth catfish',min:2,max:60,k:14.5,rate:67,act:'night',look:'sharptooth',minWait:60,maxWait:0,baits:{cut:5,sucker:2},spots:{zambezi:4,victoria:3}});
sp({id:'grayling',name:'Arctic grayling',min:0.3,max:6,k:13,rate:58,act:'day',look:'grayling',minWait:1,maxWait:300,baits:{worm:5,minnow:1},spots:{mongolia:6,greenland:2}});
sp({id:'dolly',name:'Dolly Varden',min:1,max:20,k:13.6,rate:65,act:'trout',look:'dolly',minWait:10,maxWait:600,baits:{minnow:4},spots:{kenai:5,gulfofalaska:0}});
sp({id:'rockfish',name:'Yelloweye rockfish',min:2,max:40,k:12.8,rate:105,act:'deep',look:'rockfish',minWait:20,maxWait:0,baits:{squid:6,deepbait:2},spots:{gulfofalaska:5}});
sp({id:'amberjack',name:'Greater amberjack',min:10,max:160,k:13.6,rate:42,act:'day',look:'amberjack',minWait:60,maxWait:0,baits:{squid:3,mullet:5,shrimp:0.5},spots:{gulfreefs:5}});
sp({id:'gag',name:'Gag grouper',min:3,max:80,k:13,rate:54,act:'any',look:'gag',minWait:40,maxWait:0,baits:{squid:5,shrimp:2,mullet:2},spots:{gulfreefs:5}});
sp({id:'silverperch',name:'Silver perch',min:0.5,max:16,k:12.5,rate:105,act:'day',look:'silverperch',minWait:2,maxWait:400,baits:{worm:5,minnow:1},spots:{murray:5}});
sp({id:'notothen',name:'Antarctic rockcod',min:1,max:12,k:12.5,rate:900,act:'deep',look:'notothen',minWait:20,maxWait:500,baits:{squid:5,deepbait:2},spots:{rosssea:5}});
sp({id:'northernsnakehead',name:'Giant snakehead',min:2,max:40,k:15,rate:61,act:'day',look:'snakehead',minWait:20,maxWait:900,baits:{minnow:4,cut:3},spots:{thaipark:4}});
/* small sea fish: what bites on plain bait over the side when you don't have the big rig */
sp({id:'herring',name:'Pacific herring',small:true,min:0.1,max:1.5,k:12.5,rate:60,act:'any',look:'herring',minWait:0,maxWait:240,baits:{worm:3,minnow:2,cut:4,shrimp:5,squid:3},spots:{gulfofalaska:6,arcticdeep:3}});
sp({id:'sculpin',name:'Shorthorn sculpin',small:true,min:0.2,max:4,k:11,rate:70,act:'deep',look:'sculpin',minWait:1,maxWait:300,baits:{worm:4,minnow:3,cut:4,shrimp:3,squid:3},spots:{arcticdeep:5,gulfofalaska:3}});
sp({id:'polarcod',name:'Polar cod',small:true,min:0.1,max:1.2,k:12.8,rate:120,act:'deep',look:'polarcod',minWait:0,maxWait:240,baits:{worm:3,minnow:4,cut:3,shrimp:5,squid:4},spots:{arcticdeep:6}});
sp({id:'opelu',name:'Mackerel scad',small:true,min:0.2,max:2,k:12.5,rate:90,act:'day',look:'opelu',minWait:0,maxWait:240,baits:{worm:2,minnow:3,cut:4,shrimp:5,squid:4},spots:{kona:6,openpacific:5}});
sp({id:'silverfish',name:'Antarctic silverfish',small:true,min:0.05,max:0.8,k:13,rate:400,act:'deep',look:'silverfish',minWait:0,maxWait:240,baits:{worm:2,minnow:4,cut:3,shrimp:5,squid:4},spots:{rosssea:7}});
/* Southern Ocean */
sp({id:'toothfish',name:'Antarctic toothfish',min:20,max:300,k:13.5,rate:2500,act:'deep',look:'toothfish',minWait:300,maxWait:0,baits:{deepbait:6,squid:3},spots:{rosssea:7}});
sp({id:'icefish',name:'Mackerel icefish',min:0.5,max:7,k:14,rate:900,act:'deep',look:'icefish',minWait:20,maxWait:600,baits:{squid:6,deepbait:1},spots:{rosssea:6}});
D.SPECIES=S;

/* ---------- Gear. Each buys once. ---------- */
D.LINE_TESTS=[15,30,60,150,400,1000];
D.REEL_SNAP=[0.6,0.45,0.3,0.15];
D.GEAR=[
 {id:'line1',name:'30 lb line',price:300,kind:'line',lvl:1,desc:'Holds fish up to 30 lb without snapping.'},
 {id:'line2',name:'60 lb line',price:1200,kind:'line',lvl:2,desc:'Holds fish up to 60 lb.'},
 {id:'line3',name:'150 lb line',price:4000,kind:'line',lvl:3,desc:'Holds fish up to 150 lb.'},
 {id:'line4',name:'400 lb line',price:25000,kind:'line',lvl:4,desc:'Big-game line. Holds fish up to 400 lb.'},
 {id:'line5',name:'1,000 lb line',price:120000,kind:'line',lvl:5,desc:'Deep-sea cable. Holds anything up to 1,000 lb.'},
 {id:'reel1',name:'Good reel',price:800,kind:'reel',lvl:1,desc:'A fish too heavy for your line gets away 45% of the time instead of 60%.'},
 {id:'reel2',name:'Great reel',price:6000,kind:'reel',lvl:2,desc:'Overweight fish get away only 30% of the time.'},
 {id:'reel3',name:'Tournament reel',price:40000,kind:'reel',lvl:3,desc:'Overweight fish get away only 15% of the time.'},
 {id:'hole2',name:'Second line',price:400,kind:'lines',lvl:2,desc:'Fish two lines at once.'},
 {id:'hole3',name:'Third line',price:1500,kind:'lines',lvl:3,desc:'Fish three lines at once.'},
 {id:'hole4',name:'Fourth line',price:5000,kind:'lines',lvl:4,desc:'Fish four lines at once, the most allowed.'},
 {id:'finder1',name:'Fish finder',price:600,kind:'finder',lvl:1,desc:'Shows the shape of whatever is on your hook.'},
 {id:'finder2',name:'Sonar finder',price:5000,kind:'finder',lvl:2,desc:'Shows the exact weight of the fish on your hook.'},
 {id:'finder3',name:'Legend finder',price:50000,kind:'finder',lvl:3,desc:'Glows when a legend is nearby while you wait.'},
 {id:'comfort',name:'Heater and cooler',price:2500,kind:'comfort',lvl:1,desc:'Bites come 25% sooner everywhere.'},
 {id:'paddle',name:'Paddleboard',price:0,kind:'boat',lvl:0,perk:{},desc:'Where every angler starts. Fine for ponds and lakes from the shore.'},
 {id:'kayak',name:'Fishing kayak',price:600,kind:'boat',lvl:1,perk:{},desc:'Gets you onto big lakes and rivers. Freshwater only.'},
 {id:'skiff',name:'Dinghy skiff',price:2500,kind:'boat',lvl:2,perk:{},desc:'A little outboard skiff. Handles rivers, swamps, flats and reefs.'},
 {id:'bassboat',name:'Bass boat',price:9000,kind:'boat',lvl:3,perk:{fresh:0.85},desc:'Fast and low. Bites come 15% sooner on freshwater.'},
 {id:'console',name:'Center console',price:30000,kind:'boat',lvl:4,perk:{salt:0.85,troll:0.9},desc:'A real saltwater boat. Bites come 15% sooner on salt water.'},
 {id:'sportfisher',name:'Sportfisher',price:60000,kind:'boat',lvl:5,perk:{troll:0.8,salt:0.9},desc:'Outriggers and a fighting chair. Needed to troll for tuna and marlin. Trolling bites 20% sooner.'},
 {id:'trawler',name:'Expedition trawler',price:250000,kind:'boat',lvl:6,perk:{deep:0.8,polar:0.8,troll:0.85},desc:'An ice-class steel boat with a crane. Deep-drop and polar bites come 20% sooner.'},
 {id:'yacht',name:'Golden mega yacht',price:1500000,kind:'boat',lvl:7,perk:{all:0.78},desc:'The flex. Bites come 22% sooner everywhere, and everyone can see it.'},
 {id:'deeprig',name:'Deep-drop rig',price:150000,kind:'method',lvl:1,desc:'An electric reel and 1,000 feet of braided line. Without it, deep-drop spots only give you small fish near the surface.'}
];

/* ---------- Clothes shop (cosmetic). ---------- */
D.ITEMS=[
 {id:'skin_1',slot:'skin',name:'Fair',price:0,c:{S:'#F2C9A0',s:'#D9A77A'}},
 {id:'skin_2',slot:'skin',name:'Tan',price:0,c:{S:'#D9A066',s:'#B6804A'}},
 {id:'skin_3',slot:'skin',name:'Brown',price:0,c:{S:'#A86A3C',s:'#80502A'}},
 {id:'skin_4',slot:'skin',name:'Deep',price:0,c:{S:'#6E3F23',s:'#4E2C18'}},
 {id:'hat_red',slot:'hat',name:'Red beanie',price:0,hat:'beanie',c:{R:'#D93A3A',W:'#F4F4F4',C:'#F0E6D2'}},
 {id:'hat_cap',slot:'hat',name:'Ball cap',price:150,hat:'cap',c:{R:'#2F7C9A',W:'#F4F4F4',C:'#F0E6D2',r:'#1D5468'}},
 {id:'hat_straw',slot:'hat',name:'Straw hat',price:400,hat:'straw',c:{R:'#E8D27A',W:'#F4F4F4',C:'#C9A850',r:'#C9A850'}},
 {id:'hat_bucket',slot:'hat',name:'Bucket hat',price:600,hat:'bucket',c:{R:'#6E8A5A',W:'#F4F4F4',C:'#4E6A3E',r:'#4E6A3E'}},
 {id:'hat_trapper',slot:'hat',name:'Trapper hat',price:1200,hat:'trapper',c:{R:'#6E4A2A',W:'#F4F4F4',C:'#E8DCC8'}},
 {id:'hat_captain',slot:'hat',name:'Captain\'s hat',price:8000,hat:'captain',c:{R:'#F4F4F4',W:'#F4F4F4',C:'#14294C',r:'#14294C',Y:'#FFC94A'}},
 {id:'hat_crown',slot:'hat',name:'Gold crown',price:100000,hat:'crown',c:{Y:'#FFC94A',y:'#C98A12',J:'#E5484D',U:'#3FA7F0'}},
 {id:'hat_champ',slot:'hat',name:'Champion cap',price:0,prize:true,hat:'champ',c:{B:'#3A78D8',Y:'#FFC94A',b:'#1D4A8C'}},
 {id:'hat_founder',slot:'hat',name:'Founder cap',price:0,prize:true,hat:'champ',c:{B:'#0A1530',Y:'#9FD3F2',b:'#14294C'}},
 {id:'coat_orange',slot:'coat',name:'Orange parka',price:0,c:{O:'#E8732A',o:'#B5521A',G:'#2B2F3A'}},
 {id:'coat_green',slot:'coat',name:'Fishing vest',price:200,c:{O:'#5E7F3A',o:'#3D5626',G:'#2B2F3A'}},
 {id:'coat_blue',slot:'coat',name:'Rain jacket',price:500,c:{O:'#2F7CD8',o:'#1D4F8C',G:'#2B2F3A'}},
 {id:'coat_hawaii',slot:'coat',name:'Aloha shirt',price:3000,c:{O:'#E04A6A',o:'#F0C040',G:'#2B2F3A'}},
 {id:'coat_camo',slot:'coat',name:'Camo jacket',price:4000,c:{O:{cam:['#4E6A3E','#6E8A5A','#3A4A2E','#8A7A4A']},o:'#2E3A22',G:'#2B2F3A'}},
 {id:'coat_gold',slot:'coat',name:'Gold jacket',price:60000,c:{O:'#FFC94A',o:'#C98A12',G:'#3A2200'}},
 {id:'pants_navy',slot:'pants',name:'Navy pants',price:0,c:{P:'#2C3E66',p:'#1E2C4A'}},
 {id:'pants_tan',slot:'pants',name:'Khaki shorts',price:150,c:{P:'#C9B27A',p:'#9A8656'}},
 {id:'pants_waders',slot:'pants',name:'Waders',price:900,c:{P:'#5A6E4A',p:'#3E4E32'}},
 {id:'pants_red',slot:'pants',name:'Red snow pants',price:1500,c:{P:'#D93A3A',p:'#8E2430'}},
 {id:'boots_black',slot:'boots',name:'Black boots',price:0,c:{K:'#1B1B24',k:'#0A0A10'}},
 {id:'boots_rubber',slot:'boots',name:'Rubber boots',price:200,c:{K:'#E8C840',k:'#B89A20'}},
 {id:'boots_sandals',slot:'boots',name:'Sandals',price:300,c:{K:'#D9A77A',k:'#8A5A3A'}},
 {id:'boots_white',slot:'boots',name:'Deck boots',price:1200,c:{K:'#F4F4F4',k:'#B8C0C8'}}
];
D.SLOTS=[{id:'hat',name:'HATS'},{id:'coat',name:'COATS'},{id:'pants',name:'PANTS'},{id:'boots',name:'BOOTS'},{id:'skin',name:'SKIN'}];
D.DEFAULT_OUTFIT={hat:'hat_red',coat:'coat_orange',pants:'pants_navy',boots:'boots_black',skin:'skin_1'};

/* ---------- Legends. Tiers and Season 1 presets. The server invents the rest. ---------- */
D.LEGEND_TIERS={findable:{odds:2000,name:'Findable'},rare:{odds:20000,name:'Rare'},mythic:{odds:100000,name:'Mythic'}};
D.LEGEND_DOUBLE_DAYS=14;
D.LEGEND_PRESETS=[
 {spot:'basslake',name:'Old Bucketmouth',species:'largemouth',tier:'findable',lb:25,bait:'minnow',period:'dawn',minWait:60,line:30,clue:'A bass as big as a bucket, seen rolling in the shallows at first light. Old-timers say it only takes a live minnow after a long, quiet wait.',colors:{b:'#2E4A24',d:'#1A2C14',bel:'#D8CC98',fin:'#24381C',spot:'#0C140A'}},
 {spot:'farmpond',name:'Mudbelly',species:'channel',tier:'findable',lb:60,bait:'cut',period:'night',minWait:120,line:60,clue:'The farmer swears a catfish in the pond ate a duck. It only moves at night, when cut bait sits on the bottom for a couple of hours.',colors:{b:'#4A4036',d:'#2E2822',bel:'#C8B890',fin:'#3A3028',spot:'#1A1612'}},
 {spot:'lakefork',name:'The Texas Hog',species:'largemouth',tier:'findable',lb:28,bait:'sucker',period:'dusk',minWait:90,line:30,clue:'The biggest bass in Texas. It wants a big meal at dusk, nothing less than a whole sucker.',colors:{b:'#5A7A2E',d:'#36501C',bel:'#F0E8B0',fin:'#4A6626',spot:'#1E2C12'}},
 {spot:'harlemmeer',name:'The Subway Carp',species:'carp',tier:'findable',lb:70,bait:'cut',period:'day',minWait:60,line:60,clue:'A golden carp as long as a subway bench. Daytime only, and it ignores anything smaller than cut bait.',colors:{b:'#D8A030',d:'#9A6E18',bel:'#F8E8B0',fin:'#C08A20',spot:'#7A5410'}},
 {spot:'lochness',name:'Nessie\'s Shadow',species:'eel',tier:'rare',lb:60,bait:'cut',period:'night',minWait:240,line:60,clue:'Something long and dark has lived in the loch for a very long time. Deep night, cut bait, and a wait of hours.',colors:{b:'#243A34',d:'#121E1A',bel:'#5A7A6E',fin:'#1A2C26',spot:'#0A1410'}},
 {spot:'superior',name:'The Iron Sturgeon',species:'lakesturgeon',tier:'rare',lb:320,bait:'sucker',period:'night',minWait:600,line:150,clue:'A gray sturgeon over 300 lb, spotted under the ice by a diver who never went back. Suckers, deep night, and a wait of ten hours.',colors:{b:'#5A6066',d:'#34393E',bel:'#B8BCC0',fin:'#484E54',spot:'#9AA0A6'}},
 {spot:'everglades',name:'The Swamp King',species:'muskie',tier:'rare',lb:90,bait:'mullet',period:'dusk',minWait:300,line:150,clue:'A monster muskie that escaped from an old aquarium and grew huge in the swamp. It hunts mullet at dusk and never bites early.',colors:{b:'#3E5A2A',d:'#243818',bel:'#C8D0A0',fin:'#6A4A20',spot:'#1A2A10'}},
 {spot:'okeechobee',name:'Big Mama',species:'largemouth',tier:'findable',lb:24,bait:'minnow',period:'dawn',minWait:45,line:30,clue:'The biggest bass in the Big O. Dawn, a live minnow, and a little patience.',colors:{b:'#4E6E30',d:'#2E4420',bel:'#E8E0A8',fin:'#3E5A28',spot:'#182410'}},
 {spot:'mississippi',name:'Old Scar',species:'bluecat',tier:'rare',lb:180,bait:'sucker',period:'night',minWait:480,line:150,clue:'A blue catfish with a scar from a barge propeller. It eats suckers in the dark after eight quiet hours.',colors:{b:'#4A5A6A',d:'#2C3844',bel:'#D0D8E0',fin:'#3A4854',spot:'#1A2430'}},
 {spot:'keysflats',name:'The Silver Ghost',species:'tarpon',tier:'rare',lb:320,bait:'mullet',period:'dawn',minWait:300,line:150,clue:'A tarpon so bright it hurts to look at. Dawn on the flats, live mullet, and a long wait.',colors:{b:'#D8E0E8',d:'#98A4B0',bel:'#FFFFFF',fin:'#B8C4D0',spot:'#F0F4F8'}},
 {spot:'gulfreefs',name:'The Wreck Keeper',species:'goliath',tier:'rare',lb:800,bait:'mullet',period:'night',minWait:480,line:400,clue:'A goliath grouper that owns a sunken shrimp boat. Night, live mullet, big-game line, and hours of patience.',colors:{b:'#6E5A3A',d:'#443622',bel:'#C8B890',fin:'#5A4A2E',spot:'#2A2214'}},
 {spot:'columbia',name:'The River Dragon',species:'whitesturgeon',tier:'rare',lb:1300,bait:'sucker',period:'night',minWait:720,line:400,clue:'A white sturgeon older than the dam. Night, suckers, twelve hours, and line that could tow a truck.',colors:{b:'#8A8A80',d:'#5A5A52',bel:'#E8E8E0',fin:'#6E6E66',spot:'#C8C8C0'}},
 {spot:'kenai',name:'The Kenai King',species:'chinook',tier:'rare',lb:110,bait:'cut',period:'dawn',minWait:240,line:150,clue:'A king salmon bigger than the world record. First light on the Kenai, cut bait, and a few hours.',colors:{b:'#B04840',d:'#742C28',bel:'#E8C8B0',fin:'#8A3A30',spot:'#4A1C18'}},
 {spot:'kona',name:'The Kona Ghost',species:'marlin',tier:'rare',lb:2100,bait:'lure',period:'day',minWait:360,line:1000,clue:'A pure-white blue marlin over 2,000 lb. It follows the lures at midday after a long troll and only the heaviest line holds it.',colors:{b:'#E8F0F4',d:'#B0C0CC',bel:'#FFFFFF',fin:'#C8D8E4',spot:'#D8E8F0'}},
 {spot:'openpacific',name:'The Blue Emperor',species:'bluefin',tier:'rare',lb:1200,bait:'lure',period:'dawn',minWait:300,line:1000,clue:'A bluefin tuna the size of a car. Dawn strikes only, after a five-hour troll.',colors:{b:'#1E3A6E',d:'#0E1E3E',bel:'#D8E4F0',fin:'#F0C040',spot:'#4A6AA0'}},
 {spot:'rionegro',name:'The Arapaima Queen',species:'arapaima',tier:'rare',lb:600,bait:'sucker',period:'night',minWait:480,line:400,clue:'A 600 lb arapaima that only shows up in the flooded forest at night. Live suckers and eight hours of jungle dark.',colors:{b:'#3A4A3E',d:'#1E2A22',bel:'#D84A3A',fin:'#2A3A2E',spot:'#E86A4A'}},
 {spot:'floodedforest',name:'Grandfather Redtail',species:'redtail',tier:'findable',lb:160,bait:'cut',period:'night',minWait:240,line:150,clue:'A redtail catfish older than the village. Night, cut bait, four hours.',colors:{b:'#3A3A3A',d:'#1E1E1E',bel:'#E8E0C8',fin:'#D83A2A',spot:'#2A2A2A'}},
 {spot:'victoria',name:'Mputa the Giant',species:'nileperch',tier:'rare',lb:560,bait:'sucker',period:'dusk',minWait:360,line:400,clue:'A Nile perch the fishermen named. It hunts at dusk after six hours, and only live bait will do.',colors:{b:'#7A8A90',d:'#4A585E',bel:'#E0E8EC',fin:'#5A6A70',spot:'#2A3438'}},
 {spot:'zambezi',name:'The Striped Devil',species:'tigerfish',tier:'findable',lb:85,bait:'cut',period:'day',minWait:90,line:60,clue:'A tigerfish with teeth like nails. It hits cut bait in full daylight.',colors:{b:'#D8C060',d:'#9A8838',bel:'#F8F0C0',fin:'#E05A2A',spot:'#2A2010'}},
 {spot:'ebro',name:'El Monstruo',species:'wels',tier:'rare',lb:360,bait:'sucker',period:'night',minWait:600,line:400,clue:'A wels catfish longer than the boat. Deep night, a live sucker, and ten hours of silence.',colors:{b:'#2E3A2A',d:'#182018',bel:'#C8C8A0',fin:'#242E20',spot:'#0C120A'}},
 {spot:'mongolia',name:'The River Wolf',species:'taimen',tier:'rare',lb:280,bait:'sucker',period:'dusk',minWait:360,line:400,clue:'A taimen the herders call the river wolf. Dusk, a live sucker, and six hours.',colors:{b:'#8A5A3A',d:'#563622',bel:'#E8D0B0',fin:'#D84A2A',spot:'#2A1A10'}},
 {spot:'thaipark',name:'The Golden Buddha',species:'siamesecarp',tier:'findable',lb:340,bait:'cut',period:'day',minWait:240,line:150,clue:'A giant carp with golden scales. Daytime, cut bait, four hours.',colors:{b:'#E0B030',d:'#A07818',bel:'#F8EAB0',fin:'#C89020',spot:'#7A5410'}},
 {spot:'biwa',name:'The Biwa Record',species:'largemouth',tier:'findable',lb:26,bait:'minnow',period:'dawn',minWait:60,line:30,clue:'A bass that would beat the world record. Dawn on Lake Biwa, a live minnow.',colors:{b:'#4E6E3A',d:'#2E4424',bel:'#E8E8C0',fin:'#3E5A30',spot:'#182410'}},
 {spot:'murray',name:'The Old Man of the Murray',species:'murraycod',tier:'rare',lb:300,bait:'sucker',period:'night',minWait:480,line:400,clue:'A Murray cod the size of a man. Night, live bait, eight hours under the red gums.',colors:{b:'#4A6A3A',d:'#2A4020',bel:'#E8E0A8',fin:'#3A5A2E',spot:'#D8C860'}},
 {spot:'gbr',name:'The Reef Bull',species:'gt',tier:'rare',lb:210,bait:'mullet',period:'day',minWait:240,line:400,clue:'A giant trevally that bullies sharks. Midday on the reef, live mullet, four hours.',colors:{b:'#C8D0D8',d:'#8A949E',bel:'#F8F8F8',fin:'#5A6470',spot:'#2A3038'}},
 {spot:'greenland',name:'The Ice Queen',species:'char',tier:'rare',lb:45,bait:'minnow',period:'dawn',minWait:180,line:60,clue:'An Arctic char with a belly like fire. Dawn under the ice edge, a live minnow, three hours.',colors:{b:'#4A5A6E',d:'#2A3644',bel:'#F05A2A',fin:'#F0E8E0',spot:'#F8D8C8'}},
 {spot:'arcticdeep',name:'The Leviathan',species:'greenlandshark',tier:'mythic',lb:3400,bait:'deepbait',period:'night',minWait:900,line:1000,clue:'A Greenland shark over 3,000 lb, born before the first ship crossed the Atlantic. Night, a deep-drop rig, fifteen hours, and the heaviest line made.',colors:{b:'#3A3E48',d:'#1E2028',bel:'#8A8E98',fin:'#2E323C',spot:'#5A5E68'}},
 {spot:'rosssea',name:'The Abyss King',species:'toothfish',tier:'mythic',lb:420,bait:'deepbait',period:'night',minWait:720,line:1000,clue:'A giant toothfish from the deepest, coldest water on Earth. Polar night, a deep-drop rig, twelve hours.',colors:{b:'#2A2E3A',d:'#14161E',bel:'#9AA0B0',fin:'#1E222C',spot:'#6A7088'}},
 {spot:'lakeofthewoods',name:'The Walleye Mayor',species:'walleye',tier:'findable',lb:26,bait:'minnow',period:'dusk',minWait:90,line:30,clue:'The town says the biggest walleye in the lake runs the place. Dusk, a minnow, an hour and a half.',colors:{b:'#C8A848',d:'#8A7028',bel:'#F8F0D0',fin:'#A88838',spot:'#5A4818'}},
 {spot:'millelacs',name:'Thunderjaw',species:'muskie',tier:'rare',lb:72,bait:'sucker',period:'dusk',minWait:360,line:150,clue:'A muskie that broke every rod in the bait shop. Dusk, a sucker, six hours.',colors:{b:'#5A5A3A',d:'#363622',bel:'#E0DCB8',fin:'#6A4A28',spot:'#2A2A14'}},
 {spot:'winnebago',name:'Grandmother Sturgeon',species:'lakesturgeon',tier:'rare',lb:280,bait:'sucker',period:'night',minWait:600,line:150,clue:'The oldest sturgeon in Winnebago. Night, suckers, ten hours.',colors:{b:'#6A6E62',d:'#44483E',bel:'#D0D0C0',fin:'#565A50',spot:'#B8BAA8'}},
 {spot:'gulfofalaska',name:'The Barn Door',species:'halibut',tier:'rare',lb:560,bait:'deepbait',period:'day',minWait:480,line:400,clue:'A halibut as wide as a barn door. Daytime, a deep-drop rig, eight hours on the bottom.',colors:{b:'#4A4A3A',d:'#2A2A20',bel:'#F0F0E8',fin:'#3A3A2E',spot:'#6A6A58'}}
];

/* ---------- Season prizes and misc constants. ---------- */
D.SEASON_PRIZES=[25000,15000,8000];
D.SEASON_PRIZE_TOP10=2000;
D.VARIANT_MULT={golden:10,albino:5};
D.GOLDEN_P=0.002; D.ALBINO_P=0.0053;
D.TRADE_COOLDOWN_H=24;
D.STICKERS=[{id:'noway',text:'No way!'},{id:'lucky',text:'Lucky!'},{id:'huge',text:'HUGE'},{id:'gg',text:'GG'},{id:'jealous',text:'Jealous'},{id:'wow',text:'Wow'},{id:'legend',text:'Legend'},{id:'fire',text:'On fire'}];
D.REPORT_REASONS=[{id:'name',text:'Bad username'},{id:'realname',text:'Uses a real name'},{id:'cheat',text:'Cheating'},{id:'scam',text:'Trade scam'},{id:'other',text:'Other'}];

/* ---------- Lookups and the shared math. ---------- */
D.SP_BY_ID={}; S.forEach(function(s){ D.SP_BY_ID[s.id]=s; });
D.SPOT_BY_ID={}; D.SPOTS.forEach(function(s){ D.SPOT_BY_ID[s.id]=s; });
D.REGION_BY_ID={}; D.REGIONS.forEach(function(r){ D.REGION_BY_ID[r.id]=r; });
D.BAIT_BY_ID={}; D.BAITS.forEach(function(b){ D.BAIT_BY_ID[b.id]=b; });
D.GEAR_BY_ID={}; D.GEAR.forEach(function(g){ D.GEAR_BY_ID[g.id]=g; });
D.BOATS=D.GEAR.filter(function(g){ return g.kind==='boat'; });
D.boatPerk=function(boatId,spot){ var b=D.GEAR_BY_ID[boatId]; if(!b) return 1; var p=b.perk||{}; return p.all||p[spot.water]||(spot.region==='arctic'||spot.region==='southern'?p.polar:0)||1; };
D.ITEM_BY_ID={}; D.ITEMS.forEach(function(i){ D.ITEM_BY_ID[i.id]=i; });
D.spotSpecies=function(spotId){ return S.filter(function(s){ return s.spots[spotId]>0; }); };
D.speciesWeights=function(spotId,bait,minutes,period,smallOnly){
  return S.map(function(s){
    var w=(s.spots[spotId]||0)*(s.baits[bait]||0);
    if(smallOnly&&!s.small) w=0;
    if(minutes<s.minWait) w=0;
    else if(s.maxWait&&minutes>s.maxWait) w*=Math.exp(-(minutes-s.maxWait)/s.maxWait);
    if(period) w*=D.ACT_PROFILES[s.act][period];
    return {sp:s,w:w};
  });
};
D.sizeCap=function(minutes,bait){ var b=D.BAIT_BY_ID[bait]; return (0.12+0.88*(1-Math.exp(-minutes/b.tau)))*b.capMax; };
/* The same roll the server makes, for the simulator. rnd() gives numbers in [0,1). */
D.rollCatch=function(rnd,spotId,bait,minutes,period,smallOnly){
  var list=D.speciesWeights(spotId,bait,minutes,period,smallOnly), total=0; list.forEach(function(x){ total+=x.w; });
  if(total<=0) return null;
  var pick=rnd()*total, chosen=null;
  for(var i=0;i<list.length;i++){ var x=list[i]; if(x.w<=0) continue; chosen=x; pick-=x.w; if(pick<=0) break; }
  var s=chosen.sp, b=D.BAIT_BY_ID[bait], A=1-Math.exp(-minutes/b.tau), cap=(0.12+0.88*A)*b.capMax;
  var prime=period==='dawn'||period==='dusk';
  var u=rnd(), bonus=rnd()<(0.03+0.12*A)*(prime?2:1), v=rnd();
  var f=bonus?cap*(0.75+0.25*v):cap*Math.pow(u,1.25);
  var lb=Math.round((s.min+(s.max-s.min)*f)*16)/16, inches=Math.round(s.k*Math.cbrt(lb)*4)/4;
  var vr=rnd(), variant=null; if(vr<D.GOLDEN_P) variant='golden'; else if(vr<D.ALBINO_P) variant='albino';
  return {id:s.id,lb:lb,inches:inches,bonus:bonus,variant:variant};
};
D.fishValue=function(id,lb,variant){ var s=D.SP_BY_ID[id]; if(!s||s.protected) return 0; return Math.max(1,Math.round(lb*s.rate*(D.VARIANT_MULT[variant]||1))); };
D.biteMinutes=function(rnd,spotId,bait,comfort,smallOnly){
  var b=D.BAIT_BY_ID[bait], first=Infinity;
  S.forEach(function(s){ if((!smallOnly||s.small)&&(s.spots[spotId]||0)*(s.baits[bait]||0)>0) first=Math.min(first,s.minWait); });
  if(first===Infinity) return Infinity;
  return Math.max(b.minBite,first)-Math.log(1-rnd())*b.biteMean*(comfort?0.75:1);
};
D.fmtDuration=function(min){
  if(min<1) return Math.max(0,Math.round(min*60))+'s';
  if(min<60) return Math.floor(min)+'m';
  if(min<1440){ var h=Math.floor(min/60), m=Math.floor(min%60); return m?h+'h '+m+'m':h+'h'; }
  var d=Math.floor(min/1440), hh=Math.floor((min%1440)/60); return hh?d+'d '+hh+'h':d+'d';
};
D.fmtClock=function(sec){
  sec=Math.max(0,Math.floor(sec));
  var d=Math.floor(sec/86400), h=Math.floor(sec%86400/3600), m=Math.floor(sec%3600/60), s=sec%60, p=function(n){ return String(n).padStart(2,'0'); };
  return (d?d+'d ':'')+p(h)+':'+p(m)+':'+p(s);
};
D.fmtWeight=function(lb){
  if(lb>=100) return Math.round(lb)+' lb';
  var oz=Math.round(lb*16), p=Math.floor(oz/16), o=oz%16;
  if(p===0) return o+' oz'; if(o===0) return p+' lb'; return p+' lb '+o+' oz';
};
D.money=function(n){ return '$'+Number(n).toLocaleString('en-US'); };

if(typeof module!=='undefined'&&module.exports) module.exports=D; else root.OC=D;
})(typeof window!=='undefined'?window:this);
