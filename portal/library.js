/* Selections library (admin only, never shown to clients).
   Preview mockup: seeded from past designs; new items and "add to board"
   picks are kept in this browser's localStorage. */
(function () {
  var CATS = ['Cabinets', 'Cabinet hardware', 'Countertops', 'Tile', 'Sinks', 'Kitchen faucets', 'Bathroom faucets', 'Shower trim & valves', 'Shower glass', 'Vanities', 'Toilets', 'Mirrors', 'Lighting', 'Fans', 'Range hoods', 'Disposals', 'Storage & organizers', 'Bath hardware', 'Paint'];
  var SECTIONS = [
    ['Cabinets & hardware', ['Cabinets', 'Cabinet hardware', 'Storage & organizers']],
    ['Countertops', ['Countertops']],
    ['Tile', ['Tile']],
    ['Plumbing', ['Sinks', 'Kitchen faucets', 'Bathroom faucets', 'Shower trim & valves', 'Vanities', 'Toilets', 'Disposals']],
    ['Shower glass & mirrors', ['Shower glass', 'Mirrors', 'Bath hardware']],
    ['Lighting & fans', ['Lighting', 'Fans']],
    ['Range hoods', ['Range hoods']],
    ['Paint', ['Paint']]
  ];
  var K = ['kitchen'], B = ['bath'], KB = ['kitchen', 'bath'];
  var SEED = [
    // Cabinets
    { id: 'c1', cat: 'Cabinets', name: 'Bagley door · Canvas', brand: 'KraftMaid', finish: 'Painted Canvas', vendor: "Lowe's (Rosario)", rooms: KB, bg: '#ece6da', notes: 'Buy on sale, 30%+ off. $100/box install.' },
    { id: 'c2', cat: 'Cabinets', name: 'Bagley door · Bonsai', brand: 'KraftMaid', finish: 'Painted Bonsai', vendor: "Lowe's (Rosario)", rooms: K, bg: '#6f7a5c' },
    { id: 'c3', cat: 'Cabinets', name: 'Deveron door · Warm White', brand: 'KraftMaid', finish: 'Warm White', vendor: "Lowe's (Rosario)", rooms: KB, bg: '#f1ece2' },
    { id: 'c4', cat: 'Cabinets', name: 'Boardwalk · Brown/Buckskin', brand: 'Diamond', finish: 'Stained', vendor: "Lowe's", rooms: B, bg: '#8a6b4e', notes: 'Used on the greige bathroom.' },
    { id: 'c5', cat: 'Cabinets', name: 'Homecrest shaker', brand: 'Homecrest', finish: 'Painted', vendor: 'Connect 4 Cabinets (Glenda)', rooms: KB, bg: '#e9e4da' },
    // Hardware
    { id: 'h1', cat: 'Cabinet hardware', name: 'Classic button pull', brand: '', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: KB, bg: 'radial-gradient(circle at 50% 50%,#c8a97e 0 16%,#f3efe7 17%)', unit: 'each' },
    { id: 'h2', cat: 'Cabinet hardware', name: 'Knurled bar pull 6"', brand: '', finish: 'Champagne Bronze', vendor: 'Amazon', rooms: KB, bg: 'linear-gradient(90deg,#f3efe7 20%,#c8a97e 20% 80%,#f3efe7 80%) center/100% 14% no-repeat,#f3efe7', unit: 'each' },
    { id: 'h3', cat: 'Cabinet hardware', name: 'Brushed brass bar pull', brand: '', finish: 'Brushed brass', vendor: "Lowe's", rooms: K, bg: 'linear-gradient(90deg,#f3efe7 15%,#b8955f 15% 85%,#f3efe7 85%) center/100% 12% no-repeat,#f3efe7', unit: 'each', notes: 'Small kitchen facelift.' },
    // Countertops
    { id: 't1', cat: 'Countertops', name: 'White quartz, soft gray veining', brand: '', finish: '3 cm · eased edge', vendor: 'Cary Granite (Kate)', rooms: KB, unit: 'sq ft', bg: 'linear-gradient(135deg,#f4f2ee 0%,#e9e6e0 45%,#d8d4cc 46%,#f1efea 60%)', notes: 'Estimate countertops ~$85/sq ft as a range.' },
    { id: 't2', cat: 'Countertops', name: 'Warm quartz, gold veining', brand: '', finish: '3 cm · eased edge', vendor: 'Cary Granite (Kate)', rooms: KB, unit: 'sq ft', bg: 'linear-gradient(120deg,#efe9df 0%,#e3d8c6 40%,#c9b79b 42%,#ece4d6 55%)' },
    { id: 't3', cat: 'Countertops', name: 'Taj Mahal-look quartz', brand: '', finish: '3 cm', vendor: 'Cary Granite (Kate)', rooms: KB, unit: 'sq ft', bg: 'linear-gradient(125deg,#f3ede2 0%,#e6dccb 50%,#d4c3a6 52%,#efe7da 70%)' },
    { id: 't4', cat: 'Countertops', name: 'Quartzite, natural stone', brand: '', finish: '3 cm · eased edge', vendor: 'Cary Granite (Kate)', rooms: KB, unit: 'sq ft', bg: 'linear-gradient(150deg,#f2efe9 0%,#ded9cf 35%,#a9a196 37%,#e9e5de 50%,#cfc8bc 70%)' },
    { id: 't5', cat: 'Countertops', name: 'Soapstone', brand: '', finish: 'Honed', vendor: 'Cary Granite (Kate)', rooms: K, unit: 'sq ft', bg: 'linear-gradient(140deg,#4b4f4f 0%,#5e6363 48%,#8a8e8c 49%,#565a5a 60%)' },
    { id: 't6', cat: 'Countertops', name: 'Andover warm-white quartz', brand: '', finish: '3 cm', vendor: 'Cary Granite (Kate)', rooms: B, unit: 'sq ft', bg: 'linear-gradient(135deg,#f6f2ea 0%,#efe8dc 55%,#dccdb5 56%,#f3eee5 68%)', notes: 'Explored for the greige bath.' },
    // Tile
    { id: 'l1', cat: 'Tile', name: 'Craft Cotton matte floor tile', brand: 'Tesoro', finish: 'Matte', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'repeating-linear-gradient(0deg,#e9e3d8 0 38px,#d8d0c2 38px 40px),#e9e3d8', notes: 'Traditions: retail + 25%, pass 3% card fee.' },
    { id: 'l2', cat: 'Tile', name: 'Signature Ivory wall tile', brand: '', finish: 'Gloss', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'repeating-linear-gradient(90deg,#f2ecdf 0 46px,#ddd4c2 46px 48px),#f2ecdf' },
    { id: 'l3', cat: 'Tile', name: 'Cloe Crème 2.5×8', brand: 'Bedrosians', finish: 'Glossy', vendor: 'Traditions in Tile (Nina)', rooms: KB, unit: 'sq ft', bg: 'repeating-linear-gradient(90deg,#efe6d4 0 52px,#dbcfb8 52px 54px),#efe6d4' },
    { id: 'l4', cat: 'Tile', name: 'White dolomite 12×24', brand: '', finish: 'Honed', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'repeating-linear-gradient(0deg,#f4f3ef 0 44px,#dfddd6 44px 46px),#f4f3ef' },
    { id: 'l5', cat: 'Tile', name: 'Dark 3" hex shower floor', brand: '', finish: 'Matte', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'radial-gradient(circle,#3c3b38 55%,#6c6a64 57%) 0 0/14px 14px,#3c3b38' },
    { id: 'l6', cat: 'Tile', name: 'Pebble accent', brand: '', finish: 'Natural', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'radial-gradient(ellipse 6px 4px,#b5aa98 70%,transparent 72%) 0 0/16px 12px,#d8d0c2' },
    { id: 'l7', cat: 'Tile', name: '24×48 porcelain', brand: '', finish: 'Matte', vendor: 'Traditions in Tile (Nina)', rooms: B, unit: 'sq ft', bg: 'repeating-linear-gradient(0deg,#e7e2d9 0 60px,#d3ccc0 60px 62px),#e7e2d9' },
    // Sinks & faucets
    { id: 's1', cat: 'Sinks', name: 'Stainless single bowl 30×16', brand: '', finish: 'Undermount', vendor: "Lowe's", rooms: K, bg: 'linear-gradient(#f3efe7 30%,#d9d4ca 30% 70%,#f3efe7 70%)' },
    { id: 'lf1', cat: 'Kitchen faucets', name: 'Oletto pull-down kitchen faucet', brand: 'Kraus KPF-2820SFACB', finish: 'Spot Free Antique Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 604.87, link: 'https://www.lowes.com/pd/Kraus-Oletto-Spot-Free-Antique-Chambagne-Bronze-Single-Handle-Pull-down-Kitchen-Faucet-with-Sprayer/5015730395', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/0f72506f-dd53-4ec3-9919-4a9e9965b3ec/65158315.jpg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/0f72506f-dd53-4ec3-9919-4a9e9965b3ec/65158315.jpg)', notes: 'Commercial-style pull-down.' },
    { id: 'lf2', cat: 'Kitchen faucets', name: 'Bolden pull-down kitchen faucet', brand: 'Kraus KSF-1610SFACB', finish: 'Spot Free Antique Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 399.95, link: 'https://www.lowes.com/pd/Kraus-Bolden-Spot-Free-Antique-Champagne-Bronze-Single-Handle-Touchless-Pull-down-Kitchen-Faucet-with-Sprayer/5015730475', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/f758e490-2da9-49ac-977f-26767632b24b/67710838.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/f758e490-2da9-49ac-977f-26767632b24b/67710838.jpeg)', notes: 'Commercial-style pull-down.' },
    { id: 'lf3', cat: 'Kitchen faucets', name: 'Alpen pull-down kitchen faucet', brand: 'Delta 19814Z-CZSD-DST', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 238.99, link: 'https://www.lowes.com/pd/Delta-Alpen-Champagne-Bronze-Single-Handle-Deck-mount-Pull-down-Kitchen-Faucet-with-Sprayer-Deck-Plate-Included-Soap-Dispenser-Included/5016508333', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/1124cda8-2d7a-47dd-a333-2a439ec73265/70325387.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/1124cda8-2d7a-47dd-a333-2a439ec73265/70325387.jpeg)', notes: 'Deck plate and soap dispenser included.' },
    { id: 'lf4', cat: 'Kitchen faucets', name: 'Trask pull-down kitchen faucet', brand: 'Delta 19933-CZ-DST', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 259, link: 'https://www.lowes.com/pd/Delta-Delta-TraskSingle-Handle-Pull-Down-Kitchen-Faucet-Champagne-Bronze/5016311465', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/f82f731a-86f8-4360-9b7b-4e111304ef60/70931817.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/f82f731a-86f8-4360-9b7b-4e111304ef60/70931817.jpeg)', notes: 'Deck plate included.' },
    { id: 'lf5', cat: 'Kitchen faucets', name: 'Valdosta pull-down kitchen faucet', brand: 'Delta 19957Z-CZSD-DST', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 329, link: 'https://www.lowes.com/pd/Delta-Valdosta-Champagne-Bronze-1-Handle-Deck-Mount-Pull-Down-Handle-Lever-Residential-Kitchen-Faucet/1000801080', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/73ffe500-7612-4274-a6d3-174b0fb5e94b/09478179.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/73ffe500-7612-4274-a6d3-174b0fb5e94b/09478179.png)', notes: 'Deck plate and soap dispenser included.' },
    { id: 'lf6', cat: 'Kitchen faucets', name: 'Nicoli bridge kitchen faucet', brand: 'Delta 39876LF-CZ', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 709, link: 'https://www.lowes.com/pd/Delta-Nicoli-Champagne-Bronze-Single-Handle-Deck-mount-Handle-Residential-Bridge-Kitchen-Faucet-with-Sprayer/5016066599', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/f303399c-e44b-49a7-b617-424e94073662/68963713.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/f303399c-e44b-49a7-b617-424e94073662/68963713.jpeg)', notes: 'Single-handle bridge with sprayer.' },
    { id: 'lf7', cat: 'Kitchen faucets', name: 'Renaldi bridge kitchen faucet', brand: 'Delta 2384L-CZ-PR-DST', finish: 'Lumicoat Champagne Bronze', vendor: "Lowe's", rooms: K, cost: 989, link: 'https://www.lowes.com/pd/Delta-Renaldi-Lumicoat-Champagne-Bronze-Double-Handle-Bridge-Kitchen-Faucet-with-Sprayer/5015650467', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/9cb7ada6-417f-4a09-9b23-f44b8c026e00/67937026.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/9cb7ada6-417f-4a09-9b23-f44b8c026e00/67937026.jpeg)', notes: 'Two-handle bridge with sprayer.' },
    { id: 'lf8', cat: 'Kitchen faucets', name: 'Heritage bridge kitchen faucet', brand: 'Kingston Brass WLKS1277ALBS', finish: 'Brushed Brass', vendor: "Lowe's", rooms: K, cost: 311.04, link: 'https://www.lowes.com/pd/Kingston-Brass-Heritage-Brushed-Brass-Double-Handle-Bridge-Kitchen-Faucet-Side-Spray-Included/5015184847', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/2bcc29f0-8c52-432f-bf33-8d074e851e52/68300346.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/2bcc29f0-8c52-432f-bf33-8d074e851e52/68300346.jpeg)', notes: 'Two-handle bridge, side sprayer included.' },
    { id: 'bf1', cat: 'Bathroom faucets', name: 'Dryden widespread bath faucet', brand: 'Delta 3551-SPMPU-DST', finish: 'SpotShield Stainless (brushed-nickel look)', vendor: "Lowe's", rooms: B, cost: 498.63, link: 'https://www.lowes.com/pd/Delta-Faucet-Dryden-Spotshield-Stainless-2-Handle-Widespread-WaterSense-Bathroom-Sink-Faucet-with-Drain/1003087818', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/5aae7951-6fb8-4b0f-a644-6a2c5ba22c00/16378818.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/5aae7951-6fb8-4b0f-a644-6a2c5ba22c00/16378818.png)', notes: 'Go-to bath line. 2-handle widespread, drain included.' },
    { id: 'bf2', cat: 'Bathroom faucets', name: 'Dryden centerset bath faucet', brand: 'Delta 551-SS-DST', finish: 'Stainless (brushed-nickel look)', vendor: "Lowe's", rooms: B, cost: 424.61, link: 'https://www.lowes.com/pd/Delta-Dryden-Stainless-1-handle-Single-Hole-4-in-Centerset-WaterSense-Bathroom-Sink-Faucet-with-Drain/1003074026', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/210f7234-3836-471e-8d73-ea67b18ffe4b/66058128.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/210f7234-3836-471e-8d73-ea67b18ffe4b/66058128.png)', notes: 'Go-to bath line. 1-handle, 4" centerset or single hole.' },
    { id: 'bf3', cat: 'Bathroom faucets', name: 'Dryden single-hole bath faucet', brand: 'Delta 551-CZ-DST', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 701.92, link: 'https://www.lowes.com/pd/Delta-Dryden-Champagne-Bronze-1-handle-Single-hole-4-in-centerset-WaterSense-Mid-arc-Bathroom-Sink-Faucet-with-Drain-with-Deck-Plate/5014122955', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/c02144b3-6480-4244-960a-5fda742a4af7/65299106.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/c02144b3-6480-4244-960a-5fda742a4af7/65299106.png)', notes: 'Deck plate included.' },
    { id: 'bf4', cat: 'Bathroom faucets', name: 'Lineax widespread bath faucet', brand: 'Delta 3562LF-CZMPU', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 232.38, link: 'https://www.lowes.com/pd/Delta-Lineax-Champagne-Bronze-Widespread-2-handle-WaterSense-Mid-arc-Commercial-Residential-Handle-Bathroom-Sink-Faucet-with-Drain/5018923793', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/380a9d8b-1693-4332-a1cc-1aa4a691c06a/81885656.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/380a9d8b-1693-4332-a1cc-1aa4a691c06a/81885656.jpeg)', notes: '2-handle widespread, drain included.' },
    { id: 'bf5', cat: 'Bathroom faucets', name: 'Lineax centerset bath faucet', brand: 'Delta 562SH-CZMPU-DST', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 159.66, link: 'https://www.lowes.com/pd/Delta-Lineax-Champagne-Bronze-4-in-centerset-1-handle-WaterSense-Mid-arc-Commercial-Residential-Handle-Bathroom-Sink-Faucet-with-Drain-with-Deck-Plate/5018923821', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/d2dd104b-2522-4bf8-97d0-1bf543e3fdeb/81783599.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/d2dd104b-2522-4bf8-97d0-1bf543e3fdeb/81783599.jpeg)', notes: '1-handle, deck plate included.' },
    { id: 'bf6', cat: 'Bathroom faucets', name: 'Knoxville widespread bath faucet', brand: 'Delta 35854LF-CZ', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 208.18, link: 'https://www.lowes.com/pd/Delta-Knoxville-Champagne-Bronze-2-handle-Widespread-WaterSense-High-arc-Bathroom-Sink-Faucet-with-Drain/5014345187', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/448961fb-3065-493d-a668-b6b7f23c96be/65734208.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/448961fb-3065-493d-a668-b6b7f23c96be/65734208.png)', notes: 'High-arc, 2-handle.' },
    { id: 'bf7', cat: 'Bathroom faucets', name: 'Arvo single-hole bath faucet', brand: 'Delta 15840LF-CZ', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 197.33, link: 'https://www.lowes.com/pd/Delta-Arvo-Champagne-Bronze-1-handle-Single-Hole-WaterSense-High-arc-Bathroom-Sink-Faucet-with-Drain-with-Deck-Plate/5014109879', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/76204373-614c-4360-9142-582405dd253a/64897535.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/76204373-614c-4360-9142-582405dd253a/64897535.png)', notes: 'High-arc, deck plate included.' },
    { id: 'bf8', cat: 'Bathroom faucets', name: 'Arcadia widespread bath faucet', brand: 'Delta 35892LF-SP', finish: 'SpotShield Brushed Nickel', vendor: "Lowe's", rooms: B, cost: 159, link: 'https://www.lowes.com/pd/Delta-Arcadia-Spotshield-Brushed-Nickel-2-handle-Widespread-WaterSense-Mid-arc-Bathroom-Sink-Faucet-with-Drain/5014672087', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/3383d185-b747-4a89-9c52-524acc4d09fa/65686002.png', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/3383d185-b747-4a89-9c52-524acc4d09fa/65686002.png)', notes: '2-handle widespread.' },
    { id: 'bf9', cat: 'Bathroom faucets', name: 'Eldren widespread bath faucet', brand: 'Delta 35847LF-SP', finish: 'SpotShield Brushed Nickel', vendor: "Lowe's", rooms: B, cost: 129, link: 'https://www.lowes.com/pd/Delta-Eldren-Spotshield-Brushed-Nickel-2-handle-Widespread-WaterSense-High-arc-Bathroom-Sink-Faucet-with-Drain/5014273081', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/6447da98-9dc4-485b-a488-08866938a342/68041665.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/6447da98-9dc4-485b-a488-08866938a342/68041665.jpeg)', notes: 'Budget pick. High-arc.' },
    { id: 'bf10', cat: 'Bathroom faucets', name: 'Lindor widespread bath faucet', brand: 'Moen 84504SRN', finish: 'Spot Resist Brushed Nickel', vendor: "Lowe's", rooms: B, cost: 149, link: 'https://www.lowes.com/pd/Moen-Lindor-Spot-Resist-Brushed-Nickel-2-handle-Widespread-WaterSense-Bathroom-Sink-Faucet-with-Drain/1000476785', checked: 'Nov 2', img: 'https://mobileimages.lowes.com/productimages/04ad6bb7-63e0-46d8-bf38-1754b4f163db/97983567.jpeg', bg: '#fff center/contain no-repeat url(https://mobileimages.lowes.com/productimages/04ad6bb7-63e0-46d8-bf38-1754b4f163db/97983567.jpeg)', notes: '2-handle widespread.' },
    // Shower
    { id: 'v1', cat: 'Shower trim & valves', name: 'Velum shower trim', brand: 'Delta T14237-CZ', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 163.98, link: 'https://www.lowes.com/search?searchTerm=T14237-CZ', checked: 'Oct 30', bg: 'radial-gradient(circle,#c8a97e 0 22%,#f3efe7 23%)', notes: 'Trim only. Usual amount $300 trim, $600 trim + valve.' },
    { id: 'v2', cat: 'Shower trim & valves', name: 'Saylor shower trim', brand: 'Delta T17235-CZ-I', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 339, was: 359, link: 'https://www.lowes.com/search?searchTerm=T17235-CZ-I', checked: 'Oct 30', bg: 'radial-gradient(circle,#c8a97e 0 26%,#f3efe7 27%)', notes: 'Large escutcheon.' },
    { id: 'g1', cat: 'Shower glass', name: 'Frameless glass panel + door', brand: '', finish: 'Clear', vendor: '', rooms: B, bg: 'linear-gradient(90deg,#e8eef0 0 48%,#c9d3d6 48% 50%,#e8eef0 50%)', notes: 'Own estimate line on baths.' },
    // Lighting
    { id: 'i1', cat: 'Lighting', name: 'Solia 24" vanity light', brand: 'Kichler', finish: 'Champagne Bronze', vendor: "Lowe's", rooms: B, cost: 323.99, link: 'https://www.lowes.com/search?searchTerm=Kichler+Solia+24', checked: 'Oct 30', bg: 'linear-gradient(#f3efe7 42%,#c8a97e 42% 48%,#f3efe7 48%)' },
    { id: 'i2', cat: 'Lighting', name: 'Gioe 24.25" vanity light', brand: 'Kichler', finish: 'Aged brass', vendor: "Lowe's", rooms: B, cost: 264.99, was: 249.99, link: 'https://www.lowes.com/search?searchTerm=Kichler+Gioe', checked: 'Oct 30', bg: 'linear-gradient(#f3efe7 44%,#b8955f 44% 50%,#f3efe7 50%)' },
    { id: 'i3', cat: 'Lighting', name: 'Ribbed glass pendant 12–15"', brand: '', finish: 'Aged brass', vendor: '', rooms: K, bg: 'radial-gradient(ellipse 40% 34% at 50% 60%,#e6dcc8 0 96%,#f3efe7 100%)', notes: 'Covered bulb, ~$200 target.' },
    // Other
    { id: 'm1', cat: 'Mirrors', name: 'Arched vanity mirror', brand: '', finish: 'Thin metal frame', vendor: '', rooms: B, bg: 'radial-gradient(ellipse 30% 48% at 50% 58%,#dfe4e4 0 92%,#c8a97e 93% 96%,#f3efe7 97%)' },
    { id: 'r1', cat: 'Range hoods', name: 'Wood range hood', brand: 'Hoodsly', finish: 'Paint-grade', vendor: 'Hoodsly', rooms: K, bg: 'linear-gradient(170deg,#f3efe7 30%,#ebe4d6 30% 70%,#f3efe7 70%)', notes: 'Past orders are the price reference.' },
    { id: 'd1', cat: 'Disposals', name: 'Garbage disposal', brand: '', finish: '', vendor: "Lowe's", rooms: K, bg: '#e5e1d8', notes: 'Usual amount $200.' },
    { id: 'o1', cat: 'Storage & organizers', name: 'Trash pull-out, two bins', brand: 'Rev-A-Shelf', finish: '21" base', vendor: "Lowe's", rooms: K, bg: 'linear-gradient(90deg,#d9d4ca 0 48%,#f3efe7 48% 52%,#d9d4ca 52%)', notes: 'Goes in the cabinet section.' },
    // Paint
    { id: 'p1', cat: 'Paint', name: 'Alabaster SW 7008', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#ede9df' },
    { id: 'p2', cat: 'Paint', name: 'Shoji White SW 7042', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#e7e1d5' },
    { id: 'p3', cat: 'Paint', name: 'Agreeable Gray SW 7029', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#d1cbc1' },
    { id: 'p4', cat: 'Paint', name: 'Shiitake SW 9173', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#c4b8a5' },
    { id: 'p5', cat: 'Paint', name: 'Peppercorn SW 7674', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: K, bg: '#5a5a59' },
    { id: 'p6', cat: 'Paint', name: 'Naval SW 6244', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#2f3a4b' },
    { id: 'p7', cat: 'Paint', name: 'White Dove OC-17', brand: 'Benjamin Moore', finish: '', vendor: 'Benjamin Moore', rooms: KB, bg: '#efede3' },
    { id: 'p8', cat: 'Paint', name: 'Urbane Bronze SW 7048', brand: 'Sherwin-Williams', finish: '', vendor: 'Sherwin-Williams', rooms: KB, bg: '#55504a' }
  ];
  var LISTS = {
    kitchen: { title: 'Kitchen', items: [['Cabinet layout', null], ['Cabinets', 'Cabinets'], ['Cabinet hardware', 'Cabinet hardware'], ['Countertops', 'Countertops'], ['Backsplash tile', 'Tile'], ['Sink', 'Sinks'], ['Faucet', 'Kitchen faucets'], ['Disposal', 'Disposals'], ['Range hood', 'Range hoods'], ['Pendant lights', 'Lighting'], ['Cabinet storage & pull-outs', 'Storage & organizers'], ['Paint colors', 'Paint']] },
    bath: { title: 'Bathroom', items: [['Vanity', 'Vanities'], ['Vanity top', 'Countertops'], ['Sink', 'Sinks'], ['Faucet', 'Bathroom faucets'], ['Floor tile', 'Tile'], ['Shower wall tile', 'Tile'], ['Shower floor tile', 'Tile'], ['Accent / niche tile', 'Tile'], ['Shower trim & valve', 'Shower trim & valves'], ['Shower glass', 'Shower glass'], ['Toilet', 'Toilets'], ['Mirror', 'Mirrors'], ['Vanity light', 'Lighting'], ['Exhaust fan', 'Fans'], ['Bath hardware', 'Bath hardware'], ['Paint colors', 'Paint']] }
  };
  var BOARDS = ['Cabinet layout', 'Main cabinets & uppers', 'Green section', 'Countertops', 'Backsplash tile', 'Cabinet pulls', 'Kitchen sink', 'Kitchen faucet'];

  function ls(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function all() { return SEED.concat(ls('sr-lib-items', [])); }
  function byId(id) { return all().filter(function (x) { return x.id === id; })[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function text(x) { return [x.name, x.brand, x.finish, x.vendor, x.cat, x.notes, (x.rooms || []).join(' ')].join(' ').toLowerCase(); }
  function search(q, room, cat) {
    var words = (q || '').toLowerCase().replace(/×/g, 'x').split(/\s+/).filter(Boolean);
    return all().filter(function (x) {
      if (room && (x.rooms || []).indexOf(room) < 0) return false;
      if (cat && x.cat !== cat) return false;
      var t = text(x).replace(/×/g, 'x');
      return words.every(function (w) { return t.indexOf(w) >= 0; });
    });
  }
  function priceHTML(x) {
    if (!x.cost) return '<span class="lb-noprice">Add your cost</span>';
    return '<b>' + money(x.cost) + '</b><span>your cost' + (x.unit && x.unit !== 'each' ? ' / ' + x.unit : '') + '</span><em>client ' + money(Math.round(x.cost * 125) / 100) + '</em>';
  }
  function host(u) { try { var h = new URL(u).hostname.replace(/^www\./, ''); return { 'lowes.com': "Lowe's", 'homedepot.com': 'Home Depot', 'amazon.com': 'Amazon', 'build.com': 'Build.com', 'wayfair.com': 'Wayfair' }[h] || h; } catch (e) { return 'link'; } }
  function trackHTML(x) {
    if (!x.link) return '<div class="lb-track none">No link yet &middot; add one to track the price</div>';
    var ch = x.was && x.cost ? x.cost - x.was : 0;
    return '<div class="lb-track"><a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(host(x.link)) + ' &#8599;</a><span>' +
      (x.checking ? 'Checking&hellip;' : 'Price checked ' + esc(x.checked || 'never')) + '</span>' +
      (ch ? '<em class="' + (ch < 0 ? 'down' : 'up') + '">' + (ch < 0 ? '&darr; ' : '&uarr; ') + money(Math.abs(ch)) + ' since last check</em>' : '') + '</div>';
  }
  function card(x, action) {
    return '<article class="lb-card"><div class="lb-sw" style="background:' + esc(x.bg || '#efe9de') + '"></div><div class="lb-body">' +
      '<span class="lb-cat">' + esc(x.cat) + ' &middot; ' + (x.rooms || []).map(function (r) { return r === 'bath' ? 'Bath' : 'Kitchen'; }).join(', ') + '</span>' +
      '<h3>' + esc(x.name) + '</h3><p>' + esc([x.brand, x.finish].filter(Boolean).join(' · ')) + '</p>' +
      '<p class="lb-vendor">' + esc(x.vendor || 'Vendor not set') + '</p>' + (x.notes ? '<p class="lb-note">' + esc(x.notes) + '</p>' : '') +
      trackHTML(x) + '<div class="lb-foot"><div class="lb-pr">' + priceHTML(x) + '</div>' + action(x) + '</div></div></article>';
  }

  /* ---------- Picker used inside the board builder ---------- */
  function picker(defaultCat, onPick) {
    var m = document.getElementById('lb-pick');
    if (!m) {
      m = document.createElement('div'); m.className = 'lb-modal'; m.id = 'lb-pick';
      m.innerHTML = '<div class="lb-dialog lb-pickbox"><button type="button" class="lb-x" aria-label="Close">&times;</button><span class="sr-label">Selections library</span><h2>Add options from the library</h2>' +
        '<div class="lb-bar"><input type="search" id="lb-pq" placeholder="Search the library"><select id="lb-pcat"><option value="">All categories</option>' + CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div>' +
        '<div class="lb-plist" id="lb-plist"></div><div class="lb-actions"><button class="sr-btn" type="button" id="lb-pdone">Done</button><a href="admin-library.html" class="lb-link">Open the full library &rarr;</a></div></div>';
      document.body.appendChild(m);
      m.querySelector('.lb-x').onclick = m.querySelector('#lb-pdone').onclick = function () { m.hidden = true; };
      m.addEventListener('click', function (e) { if (e.target === m) m.hidden = true; });
    }
    var q = m.querySelector('#lb-pq'), c = m.querySelector('#lb-pcat'), list = m.querySelector('#lb-plist');
    function draw() {
      var r = search(q.value, '', c.value);
      list.innerHTML = r.length ? r.map(function (x) {
        return '<div class="lb-prow"><div class="lb-sw sm" style="background:' + esc(x.bg || '#efe9de') + '"></div><div><b>' + esc(x.name) + '</b><span>' + esc([x.brand, x.finish, x.vendor].filter(Boolean).join(' · ')) + '</span></div><div class="lb-pr">' + priceHTML(x) + '</div><button type="button" class="ab-mini" data-pick="' + x.id + '">Add</button></div>';
      }).join('') : '<p class="ap-empty">Nothing matches. Try another word, or add it to the library.</p>';
    }
    q.oninput = c.onchange = draw;
    list.onclick = function (e) { var b = e.target.closest('[data-pick]'); if (!b) return; onPick(byId(b.dataset.pick)); b.textContent = 'Added ✓'; b.disabled = true; };
    q.value = ''; c.value = defaultCat || ''; draw(); m.hidden = false; q.focus();
  }

  window.SRLibrary = { all: all, byId: byId, search: search, picker: picker, CATS: CATS, LISTS: LISTS,
    pending: function (board) { var p = ls('sr-lib-pending', []); return p.filter(function (x) { return x.board === board; }); },
    clearPending: function (board) { lsSet('sr-lib-pending', ls('sr-lib-pending', []).filter(function (x) { return x.board !== board; })); } };

  /* ---------- Library page ---------- */
  var grid = document.getElementById('lb-grid'); if (!grid) return;
  var state = { q: '', room: '', cat: '' };
  var q = document.getElementById('lb-q'), catbar = document.getElementById('lb-catbar');
  function counts() { document.getElementById('lb-count').textContent = all().length; document.getElementById('lb-cats').textContent = CATS.length; }
  function drawCats() {
    var base = search(state.q, state.room, '');
    catbar.innerHTML = '<button type="button" data-cat=""' + (state.cat ? '' : ' class="on"') + '>All <i>' + base.length + '</i></button>' +
      CATS.map(function (c) { var n = base.filter(function (x) { return x.cat === c; }).length; return n ? '<button type="button" data-cat="' + c + '"' + (state.cat === c ? ' class="on"' : '') + '>' + c + ' <i>' + n + '</i></button>' : ''; }).join('');
  }
  function draw() {
    drawCats();
    var r = search(state.q, state.room, state.cat);
    document.getElementById('lb-result').textContent = r.length + ' item' + (r.length === 1 ? '' : 's') + (state.q ? ' matching “' + state.q + '”' : '');
    var act = function (x) { return '<button type="button" class="ab-mini" data-addto="' + x.id + '">Add to board</button>'; };
    if (!r.length) { grid.innerHTML = '<p class="ap-empty">Nothing matches. <a href="#" id="lb-empty-add">Add it to the library</a>.</p>'; drawNav([]); return; }
    var shown = [];
    grid.innerHTML = SECTIONS.map(function (sec, i) {
      var items = r.filter(function (x) { return sec[1].indexOf(x.cat) >= 0; });
      if (!items.length) return '';
      shown.push([sec[0], items.length, i]);
      var subs = sec[1].filter(function (c) { return items.some(function (x) { return x.cat === c; }); });
      return '<section class="lb-sec" id="sec-' + i + '"><div class="lb-sec-head"><h2>' + sec[0] + '</h2><span>' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div>' +
        subs.map(function (c) {
          var its = items.filter(function (x) { return x.cat === c; });
          return (subs.length > 1 ? '<h3 class="lb-subhead">' + c + ' <i>' + its.length + '</i></h3>' : '') + '<div class="lb-cards">' + its.map(function (x) { return card(x, act); }).join('') + '</div>';
        }).join('') + '</section>';
    }).join('');
    drawNav(shown);
  }
  var nav = document.getElementById('lb-nav');
  function drawNav(shown) {
    nav.innerHTML = '<span class="sr-label">Sections</span>' + shown.map(function (s) { return '<a href="#sec-' + s[2] + '">' + s[0] + ' <i>' + s[1] + '</i></a>'; }).join('');
  }
  q.oninput = function () { state.q = q.value.trim(); draw(); };
  document.querySelector('.lb-rooms').onclick = function (e) { var b = e.target.closest('[data-room]'); if (!b) return; state.room = b.dataset.room; this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); state.cat = ''; draw(); };
  catbar.onclick = function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.dataset.cat; draw(); };

  // tabs
  document.querySelector('.lb-tabs').onclick = function (e) {
    var b = e.target.closest('[data-tab]'); if (!b) return;
    this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    document.getElementById('tab-items').hidden = b.dataset.tab !== 'items';
    document.getElementById('tab-lists').hidden = b.dataset.tab !== 'lists';
  };
  // checklists
  document.getElementById('lb-lists').innerHTML = Object.keys(LISTS).map(function (k) {
    var L = LISTS[k];
    return '<section class="ab-card lb-list"><div class="ab-card-head"><h2>' + L.title + '</h2><span class="ci-src">' + L.items.length + ' selections</span></div><ol>' +
      L.items.map(function (it) {
        var n = it[1] ? all().filter(function (x) { return x.cat === it[1] && (x.rooms || []).indexOf(k) >= 0; }).length : null;
        return '<li><span>' + it[0] + '</span>' + (n === null ? '<em>approval board</em>' : '<a href="#" data-jump="' + it[1] + '" data-room="' + k + '">' + n + ' in library</a>') + '</li>';
      }).join('') + '</ol><div class="lb-actions"><button class="sr-btn" type="button">Start a project&#39;s boards from this list&hellip;</button><button class="ab-mini ghost" type="button">Edit list</button></div></section>';
  }).join('');
  document.getElementById('lb-lists').onclick = function (e) {
    var a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault();
    state = { q: '', room: a.dataset.room, cat: a.dataset.jump }; q.value = '';
    document.querySelectorAll('.lb-rooms button').forEach(function (x) { x.classList.toggle('on', x.dataset.room === state.room); });
    document.querySelector('[data-tab="items"]').click(); draw();
  };

  // add to board
  var addto = document.getElementById('lb-addto'), cur = null;
  document.getElementById('lb-board').innerHTML = BOARDS.map(function (b) { return '<option>' + b + '</option>'; }).join('');
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-addto]');
    if (e.target.id === 'lb-empty-add') { e.preventDefault(); openNew(); return; }
    if (!b) return; cur = byId(b.dataset.addto);
    document.getElementById('lb-addto-name').textContent = cur.name;
    var guess = { 'Countertops': 'Countertops', 'Tile': 'Backsplash tile', 'Cabinet hardware': 'Cabinet pulls', 'Sinks': 'Kitchen sink', 'Kitchen faucets': 'Kitchen faucet', 'Cabinets': 'Main cabinets & uppers' }[cur.cat];
    if (guess) document.getElementById('lb-board').value = guess;
    document.getElementById('lb-addto-price').innerHTML = cur.cost ? 'Your cost ' + money(cur.cost) + ' &rarr; client price ' + money(Math.round(cur.cost * 125) / 100) + '. The board works out whether it&rsquo;s within the allowance or an upgrade.' : 'No cost saved yet. Add the job&rsquo;s cost on the board (quantity and size vary by job).';
    document.getElementById('lb-addto-done').hidden = true; addto.hidden = false;
  });
  document.getElementById('lb-addto-go').onclick = function () {
    var board = document.getElementById('lb-board').value, p = ls('sr-lib-pending', []);
    p.push({ board: board, id: cur.id }); lsSet('sr-lib-pending', p);
    var d = document.getElementById('lb-addto-done'); d.hidden = false;
    d.innerHTML = 'Added to <b>' + esc(board) + '</b> as a new option. ' + (board === 'Countertops' ? '<a href="admin-boards.html">Open the board &rarr;</a>' : '(In the preview, only the Countertops board opens.)');
  };

  // new item
  var nw = document.getElementById('lb-new'), form = document.getElementById('lb-form');
  document.getElementById('lb-form-cat').innerHTML = CATS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  function openNew() { form.reset(); nw.hidden = false; form.name.focus(); }
  document.getElementById('lb-add-open').onclick = openNew;
  form.onsubmit = function () {
    if (!form.name.value.trim()) { form.name.focus(); return false; }
    var rooms = []; if (form.kitchen.checked) rooms.push('kitchen'); if (form.bath.checked) rooms.push('bath');
    var items = ls('sr-lib-items', []);
    items.push({ id: 'u' + Date.now(), cat: form.cat.value, name: form.name.value.trim(), brand: form.brand.value.trim(), finish: form.finish.value.trim(), vendor: form.vendor.value.trim(), cost: parseFloat(form.cost.value) || 0, unit: form.unit.value, rooms: rooms.length ? rooms : ['kitchen', 'bath'], notes: form.notes.value.trim(), link: form.link.value.trim() });
    lsSet('sr-lib-items', items); nw.hidden = true; counts(); draw(); return false;
  };
  document.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { b.closest('.lb-modal').hidden = true; }; });
  document.querySelectorAll('.lb-modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) m.hidden = true; }); });

  var chk = document.getElementById('lb-check');
  if (chk) chk.onclick = function () {
    var linked = SEED.filter(function (x) { return x.link; });
    linked.forEach(function (x) { x.checking = true; }); draw(); chk.disabled = true; chk.textContent = 'Checking ' + linked.length + ' prices…';
    setTimeout(function () {
      var t = new Date(), d = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][t.getMonth()] + ' ' + t.getDate();
      linked.forEach(function (x) { x.checking = false; x.checked = d + ', ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); });
      chk.disabled = false; chk.textContent = 'Check prices now'; draw();
      document.getElementById('lb-result').textContent += ' · Prices checked just now (preview: sample prices)';
    }, 1400);
  };
  counts(); draw();
})();
