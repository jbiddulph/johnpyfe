/**
 * Seed 20 SEO-friendly UK pub/bar news articles (July–August 2026).
 * Usage: node --env-file=.env scripts/seed-news-july-august-2026.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const articles = [
  {
    title: 'UK Pub Sales Surge in July 2026 as World Cup Boosts Wet-Led Pubs',
    slug: 'uk-pub-sales-july-2026-world-cup-wet-led-pubs',
    excerpt:
      'Like-for-like UK pub sales rose 4.2% in July 2026 as World Cup football and warm weather lifted wet-led venues across the country.',
    keywords: 'UK pub sales July 2026, World Cup pubs, wet-led pubs, pub trade UK, sports pubs',
    imageUrl: '/assets/images/news/july-2026-uk-pub-sales-world-cup.jpg',
    publishedAt: new Date('2026-08-25T10:00:00Z'),
    content: `
<p>UK pubs enjoyed one of their strongest trading months of 2026 in July, with like-for-like sales climbing as football fans packed wet-led venues during the men’s World Cup.</p>
<h2>How strong were July 2026 pub sales?</h2>
<p>Industry trackers reported overall like-for-like pub sales up around 4.2% versus July 2025. Footfall was helped by England’s run of major match nights, while restaurant and bar groups saw flatter or falling trade over the same period.</p>
<h2>Why wet-led pubs won the World Cup summer</h2>
<p>Drink-led pubs and sports bars converted big screens into busy sessions. Average drinks sales nearly doubled on key semi-final nights, and operators said matchday dwell time and draught volumes both improved where venues focused on beer, cider and shared screens.</p>
<h2>What it means for UK pubs and bars</h2>
<p>The July bounce shows how live sport still drives the British pub economy. Even so, growth remained soft in real terms against inflation, reminding operators that cost pressures have not gone away.</p>
<p>Find sports-friendly venues near you in our <a href="/venues">UK pubs directory</a> and browse listings by town or county.</p>
`.trim(),
  },
  {
    title: 'Draught Beer Volumes Rise in UK Pubs Despite Fewer Venues Open',
    slug: 'draught-beer-volumes-rise-uk-pubs-july-2026',
    excerpt:
      'Draught volumes in UK pubs rose 3.9% in July 2026 even as the number of licensed venues fell year on year, Market Watch data shows.',
    keywords: 'draught beer UK pubs, July 2026 pub trade, beer volumes, UK bars, Market Watch pubs',
    imageUrl: '/assets/images/news/draught-beer-volumes-uk-pubs-july-2026.jpg',
    publishedAt: new Date('2026-08-19T11:00:00Z'),
    content: `
<p>British pubs poured more draught beer and cider in July 2026 than a year earlier, even though fewer licensed venues were trading nationwide.</p>
<h2>July draught volumes at UK pubs</h2>
<p>Market Watch figures from The Oxford Partnership and Vianet showed total draught volumes up 3.9% against July 2025, with average rate of sale rising more than 5%. Hot weather and World Cup fixtures helped fill beer gardens and bar stools.</p>
<h2>Fewer pubs, higher occupancy</h2>
<p>Operating venue numbers slipped from about 100,400 to under 99,000 over twelve months. Remaining pubs reported higher occupancy, longer visits and spend per head close to £27, with food and drink both contributing.</p>
<h2>Regional winners for draught sales</h2>
<p>London led the recovery with draught volumes up over 8%, followed by suburban and rural pubs. City-centre sites grew more slowly, highlighting how location still shapes summer trade.</p>
<p>Explore coastal and town listings in our <a href="/counties">county pub guides</a>.</p>
`.trim(),
  },
  {
    title: 'UK Pub Market Forecast to Reach £24.7bn in 2026 Despite Closures',
    slug: 'uk-pub-market-forecast-247bn-2026-despite-closures',
    excerpt:
      'The UK pub and bar market is forecast to grow to £24.7bn in 2026, even as outlet numbers fall by about seven net closures a week.',
    keywords: 'UK pub market 2026, pub industry forecast, pub closures UK, bar market value, hospitality UK',
    imageUrl: '/assets/images/news/uk-pub-market-forecast-2026.jpg',
    publishedAt: new Date('2026-07-28T09:30:00Z'),
    content: `
<p>Analysts expect the UK pub and bar market to be worth around £24.7 billion in 2026, a modest rise that masks ongoing pressure on venue numbers.</p>
<h2>Value growth, estate decline</h2>
<p>Lumina Intelligence forecasts roughly 2% market growth this year, while outlet counts are expected to fall nearly 1% to about 41,000 sites — around seven net closures every week.</p>
<h2>Costs still squeeze UK pubs and bars</h2>
<p>Employment costs, business rates, energy and duty remain the main headwinds. Value growth is therefore fragile: surviving venues may take more spend, but the national estate continues to shrink.</p>
<h2>Outlook for pub operators</h2>
<p>The market could approach £25.7bn by 2029 if trends hold, yet annual growth is likely to stay modest. Operators investing in food, sport and community occasions are better placed than sites relying on walk-in drink trade alone.</p>
`.trim(),
  },
  {
    title: 'British Pubs Closing Nearly Two a Day as Industry Seeks Tax Reform',
    slug: 'british-pubs-closing-two-a-day-2026-tax-reform',
    excerpt:
      'Around two British pubs closed every day in early 2026, the BBPA warns, urging longer-term tax reform beyond temporary business rates relief.',
    keywords: 'pub closures UK 2026, BBPA pubs, business rates pubs, save British pubs, hospitality tax',
    imageUrl: '/assets/images/news/british-pub-closures-2026.jpg',
    publishedAt: new Date('2026-07-15T10:00:00Z'),
    content: `
<p>British pubs continue to shut at a worrying pace in 2026, with industry leaders saying busy tills are not enough when tax and operating costs wipe out profit.</p>
<h2>How many UK pubs are closing?</h2>
<p>The British Beer &amp; Pub Association reported 161 pub closures in the first quarter of 2026 across England, Scotland and Wales — almost two a day — with thousands of jobs affected.</p>
<h2>Business rates relief and what pubs still need</h2>
<p>A 15% business rates cut for pubs and music venues has started to ease bills, but campaigners say only permanent reform of hospitality taxes and duty will stop further losses.</p>
<h2>Why communities feel the impact</h2>
<p>When a local pub closes, neighbourhoods lose a meeting place as well as employment. Trade bodies want government to treat pubs as social infrastructure, not only commercial premises.</p>
`.trim(),
  },
  {
    title: 'Wetherspoon Opens New UK Pubs from Hessle to Airports in 2026 Expansion',
    slug: 'wetherspoon-new-uk-pubs-hessle-crewe-airports-2026',
    excerpt:
      'JD Wetherspoon is rolling out new pubs across the UK in 2026, with openings from Hessle and Crewe to Heathrow, Manchester Airport and central London.',
    keywords: 'Wetherspoon new pubs 2026, JD Wetherspoon openings, Home Farm Hessle, airport pubs UK',
    imageUrl: '/assets/images/news/wetherspoon-new-pubs-uk-2026.jpg',
    publishedAt: new Date('2026-08-12T16:00:00Z'),
    content: `
<p>JD Wetherspoon is pushing ahead with a fresh wave of UK pub openings through autumn 2026, spanning towns, university sites and airport terminals.</p>
<h2>Where are the new Wetherspoon pubs?</h2>
<p>Recent and upcoming sites include Home Farm in Hessle, The Marshfield Bank Farm House in Crewe, The Heath Hotel near Southampton, The Cranborne Hundred in Ferndown, Bedford South, Piccadilly Hall in London and The Benjamin Franklin at Charing Cross, plus airport bars at Heathrow, Manchester and Barcelona.</p>
<h2>Jobs and design focus</h2>
<p>Each venue is designed around local history in converted or refurbished buildings. The Sir Frank Whittle at Heathrow alone was reported as a multi-million-pound project creating around 100 roles.</p>
<h2>Expansion amid cost pressure</h2>
<p>The openings come after Wetherspoon flagged softer profits and higher wage, food and rates costs. The chain still operates around 800 managed and franchise pubs across the UK and Ireland.</p>
`.trim(),
  },
  {
    title: 'New Wetherspoon Pub in Crewe Creates 70 Jobs at Marshfield Bank Farm House',
    slug: 'wetherspoon-crewe-marshfield-bank-farm-house-jobs-2026',
    excerpt:
      'JD Wetherspoon’s Marshfield Bank Farm House in Crewe is set to open with 70 new jobs after a £1.5m development on a former Beefeater site.',
    keywords: 'Wetherspoon Crewe, Marshfield Bank Farm House, pubs in Crewe, new pub jobs Cheshire',
    imageUrl: '/assets/images/news/wetherspoon-crewe-marshfield-bank-2026.jpg',
    publishedAt: new Date('2026-08-24T12:00:00Z'),
    content: `
<p>Crewe is gaining a major new pub as JD Wetherspoon prepares to open The Marshfield Bank Farm House, creating around 70 jobs in Cheshire.</p>
<h2>Where is the new Crewe Wetherspoon?</h2>
<p>The pub occupies the former Beefeater site on Coppenhall Lane in Woolstanwood after a reported £1.5 million redevelopment. Opening hours are expected to run from early morning through late evening, with food served most of the day.</p>
<h2>Drinks and local character</h2>
<p>Like other Wetherspoon openings, the site will spotlight real ales, traditional ciders, craft and world beers, alongside a menu aimed at all-day custom.</p>
<h2>Why it matters for Crewe hospitality</h2>
<p>New openings remain rare in many towns. A large managed pub with dozens of roles is a vote of confidence in local footfall and a boost for job seekers in the area.</p>
`.trim(),
  },
  {
    title: 'Wetherspoon Craft Cider Festival Returns to UK Pubs July–August 2026',
    slug: 'wetherspoon-craft-cider-festival-uk-pubs-july-august-2026',
    excerpt:
      'Wetherspoon’s 10-day Craft Cider Festival ran from 31 July to 9 August 2026, showcasing up to 15 craft ciders in pubs across the UK.',
    keywords: 'Wetherspoon cider festival 2026, craft cider UK pubs, cider festival pubs, JD Wetherspoon drinks',
    imageUrl: '/assets/images/news/wetherspoon-craft-cider-festival-2026.jpg',
    publishedAt: new Date('2026-08-01T09:00:00Z'),
    content: `
<p>Cider fans had a midsummer treat as JD Wetherspoon revived its Craft Cider Festival across UK pubs from late July into early August 2026.</p>
<h2>When was the 2026 cider festival?</h2>
<p>The 10-day event ran from Friday 31 July to Sunday 9 August, featuring up to 15 ciders from producers across the south-west and beyond — from classic apple styles to fruitier craft pours.</p>
<h2>How to try festival ciders in pubs</h2>
<p>Many sites offered tasting notes in-pub and via the Wetherspoon app, with some venues promoting sampler options so guests could try several styles in one visit. CAMRA members could also use voucher discounts where applicable.</p>
<h2>Summer beer garden season</h2>
<p>Operators hoped for fine weather so drinkers could enjoy festival pours outdoors. Seasonal festivals remain a proven way for large pub groups to refresh menus and pull in curious customers.</p>
`.trim(),
  },
  {
    title: '280 Wetherspoon Pubs Listed in CAMRA Good Beer Guide 2026',
    slug: 'wetherspoon-pubs-camra-good-beer-guide-2026',
    excerpt:
      'CAMRA has included 280 JD Wetherspoon pubs in The Good Beer Guide 2026, recognising consistent real ale quality across the UK estate.',
    keywords: 'CAMRA Good Beer Guide 2026, Wetherspoon real ale, best pubs UK, Good Beer Guide pubs',
    imageUrl: '/assets/images/news/camra-good-beer-guide-wetherspoon-2026.jpg',
    publishedAt: new Date('2026-07-20T10:00:00Z'),
    content: `
<p>Real ale lovers have fresh destinations to tick off after CAMRA placed 280 Wetherspoon pubs in The Good Beer Guide 2026.</p>
<h2>Why so many Wetherspoon pubs made the guide</h2>
<p>Local CAMRA branches select entries after repeat visits that judge beer quality, service, décor and atmosphere. A strong real ale offer is treated as a signal that the wider pub experience is also well run.</p>
<h2>University franchise first</h2>
<p>Luther’s Bar at Newcastle University’s students’ union became the first university franchise Wetherspoon site to appear in the guide — a notable moment for campus hospitality.</p>
<h2>What this means for drinkers</h2>
<p>With more than a third of the company’s pubs recognised, the listing underlines how large chains can still compete on cask quality when cellar craft and guest ales are taken seriously.</p>
`.trim(),
  },
  {
    title: 'Angel Inn Opens as Bold Street Liverpool’s First Traditional Pub',
    slug: 'angel-inn-bold-street-liverpool-traditional-pub-opens-2026',
    excerpt:
      'The Angel Inn opened on Bold Street, Liverpool on 12 August 2026, billed as the street’s first proper traditional pub in the former Maggie May’s unit.',
    keywords: 'Angel Inn Liverpool, Bold Street pubs, Liverpool traditional pub, 1936 Pub Company, pubs in Liverpool',
    imageUrl: '/assets/images/news/angel-inn-liverpool-bold-street-2026.jpg',
    publishedAt: new Date('2026-08-12T11:00:00Z'),
    content: `
<p>Liverpool’s Bold Street has a new traditional boozer: The Angel Inn opened in mid-August 2026 in the former Maggie May’s café unit.</p>
<h2>A proper pub for Bold Street</h2>
<p>Run by Rob Guttmann’s 1936 Pub Company — also behind The Vines, The Masonic Arms and The Monro — the Angel Inn leans into Victorian fittings, a reclaimed bar and a stout-forward drinks range including Guinness, Beamish, Brennan’s and Murphy’s.</p>
<h2>Low-key opening, classic pub food</h2>
<p>Operators skipped a flashy launch in favour of propping the door open at 11am on 12 August. Expect simple pub classics, toasties and bar snacks rather than a full restaurant menu.</p>
<h2>Why Liverpool pub-goers care</h2>
<p>Bold Street has long been known for cafés, restaurants and bars. A cask-and-stout-led public house fills a gap for drinkers who want a classic city-centre session.</p>
<p>Browse more <a href="/town/liverpool">pubs in Liverpool</a> on UK Pubs.</p>
`.trim(),
  },
  {
    title: 'The Plough in Staining Reopens After £450k Family-Friendly Refurb',
    slug: 'plough-staining-reopens-450k-refurb-august-2026',
    excerpt:
      'The Plough in Staining near Blackpool reopened on 5 August 2026 after a £450,000 refurbishment into a modern, dog-friendly country pub.',
    keywords: 'Plough Staining, pubs near Blackpool, Lancashire pubs reopen, Star Pubs, family friendly pubs',
    imageUrl: '/assets/images/news/plough-staining-blackpool-reopens-2026.jpg',
    publishedAt: new Date('2026-08-05T10:00:00Z'),
    content: `
<p>Village drinkers near Blackpool have their local back: The Plough in Staining reopened in early August 2026 after a major half-million-pound makeover.</p>
<h2>What changed at The Plough</h2>
<p>New licensees Brad and Jo Peacock, returning from a Cumbria pub, oversaw a refurb designed for families and dog walkers. The layout now mixes bar, dining and games space with a modern country-pub feel and a garden seating more than 150 guests.</p>
<h2>Food-led community pub</h2>
<p>Owned by Star Pubs, the venue will serve food alongside drinks and aims to become Staining’s everyday meeting place again after closing briefly for works in July.</p>
<h2>Soft opening excitement</h2>
<p>Locals were invited to a soft opening ahead of the official 11am launch on 5 August, underlining how village pubs still rely on neighbourly goodwill when they relaunch.</p>
`.trim(),
  },
  {
    title: 'Eight Bells Hawkhurst Closes Despite Busy Trade as Pub Costs Soar',
    slug: 'eight-bells-hawkhurst-kent-pub-closes-august-2026',
    excerpt:
      'The Eight Bells in Hawkhurst, Kent closed in August 2026 despite strong local support, with operators citing rent, energy, labour and food costs.',
    keywords: 'Eight Bells Hawkhurst, Kent pub closes, country pubs UK, pub costs 2026, Weald pubs',
    imageUrl: '/assets/images/news/eight-bells-hawkhurst-kent-closes-2026.jpg',
    publishedAt: new Date('2026-08-23T09:00:00Z'),
    content: `
<p>A well-supported country pub in Kent has shut its doors, highlighting how full bars are no guarantee of survival when overheads keep rising.</p>
<h2>Why the Eight Bells closed</h2>
<p>Operators at The Eight Bells on The Moor in Hawkhurst said the pub was rarely empty, but high rent, energy, labour and ingredient costs made trading impossible after almost two years on the lease.</p>
<h2>Country pubs under extra pressure</h2>
<p>Large rural buildings cost more to heat and maintain while offering less footfall than town centres. Even after recent business rates help for pubs, many freeholders and tenants say margins remain too thin.</p>
<h2>Community reaction</h2>
<p>Locals expressed sadness online as the team thanked regulars and staff. The story is familiar across England’s villages: affection for the pub is high, but the maths of keeping it open is getting harder.</p>
`.trim(),
  },
  {
    title: 'Hammersmith Ram Pub Closes After 300 Years on King Street',
    slug: 'hammersmith-ram-pub-closes-king-street-london-2026',
    excerpt:
      'Young’s has closed the Hammersmith Ram on King Street, ending around 300 years as an inn and leaving another gap in west London’s pub scene.',
    keywords: 'Hammersmith Ram closes, King Street pubs, Young’s pubs London, Hammersmith pubs, London pub closures',
    imageUrl: '/assets/images/news/hammersmith-ram-london-pub-closes-2026.jpg',
    publishedAt: new Date('2026-08-19T14:00:00Z'),
    content: `
<p>West London has lost a landmark inn after Young’s closed the Hammersmith Ram on King Street at the end of July 2026.</p>
<h2>End of an era for Hammersmith drinkers</h2>
<p>The Ram’s history as a public house stretches back roughly three centuries. Regulars knew it for Irish music nights, Sunday roasts and quizzes before the brewery said a review of plans led to permanent closure.</p>
<h2>Another King Street loss</h2>
<p>The shutdown follows the earlier loss of the Plough &amp; Harrow nearby, raising concerns about the thinning of traditional pubs along a busy Hammersmith corridor opposite the Livat centre.</p>
<h2>London’s wider pub challenge</h2>
<p>Even capital venues with heritage and events calendars are not immune when property strategies and cost bases change. Campaigners continue to urge stronger planning protection for pubs at risk of conversion.</p>
`.trim(),
  },
  {
    title: 'Tollgate Old Trafford Reopens as £400k Marston’s Sports Pub',
    slug: 'tollgate-old-trafford-manchester-sports-pub-reopens-2026',
    excerpt:
      'The Tollgate in Old Trafford reopened on 19 August 2026 after a £400,000 Marston’s Grandstand refurb packed with giant HD screens for matchdays.',
    keywords: 'Tollgate Old Trafford, Manchester sports pubs, pubs near Old Trafford, Marston’s Grandstand, Man Utd pubs',
    imageUrl: '/assets/images/news/tollgate-old-trafford-sports-pub-2026.jpg',
    publishedAt: new Date('2026-08-19T18:00:00Z'),
    content: `
<p>Manchester United fans have a refreshed pre-match base after The Tollgate in Old Trafford relaunched as a Marston’s Grandstand sports pub.</p>
<h2>What’s new at The Tollgate</h2>
<p>A £400,000 investment brought a giant HD screen, multiple displays, upgraded sound, tiered seating and outdoor screens. The menu leans into wings, nachos, burgers and sharing boxes designed for big-game grazing.</p>
<h2>Community and matchday focus</h2>
<p>Opposite Trafford Bar Metrolink, the pub has long been packed before home fixtures. Local community figure Ying-Hoi Soo pulled the first pint at the 19 August reopening.</p>
<h2>Sports pubs still investing</h2>
<p>From football and rugby to F1 and darts, operators are doubling down on stadium-style viewing. For fans hunting screens near Old Trafford, The Tollgate is firmly back on the map.</p>
<p>See more venues near Premier League grounds in our <a href="/#premier-league-pubs">stadium pubs guide</a>.</p>
`.trim(),
  },
  {
    title: 'Vulcan Inn Walkden Community Pub Reopens After £170k Makeover',
    slug: 'vulcan-inn-walkden-community-pub-reopens-2026',
    excerpt:
      'The Vulcan Inn in Walkden reopened on 15 August 2026 after a £170,000 refurbishment led by long-serving licensees and Admiral Taverns.',
    keywords: 'Vulcan Inn Walkden, Salford community pubs, Admiral Taverns, pubs in Walkden, Greater Manchester pubs',
    imageUrl: '/assets/images/news/vulcan-inn-walkden-community-pub-2026.jpg',
    publishedAt: new Date('2026-08-15T12:00:00Z'),
    content: `
<p>Walkden’s Vulcan Inn is back after a six-figure refresh designed to keep the venue at the heart of community life in Greater Manchester.</p>
<h2>Local licensees lead the relaunch</h2>
<p>Jo Mullineux and Gary Ingham, who have worked at the pub for more than two decades and live nearby, partnered with Admiral Taverns on a £170,000 transformation that modernises the interior while keeping its neighbourhood character.</p>
<h2>Live music, darts and quizzes</h2>
<p>The calendar includes Saturday live music, Monday darts and a Tuesday quiz, plus planned charity fundraisers. Family-friendly positioning is central to the new chapter.</p>
<h2>Why community pubs matter</h2>
<p>While high streets lose venues, invested community pubs that programme regular events often prove more resilient — and more loved.</p>
`.trim(),
  },
  {
    title: 'Dolphin Pub in Tynemouth Reopens After £169k Community Refurb',
    slug: 'dolphin-pub-tynemouth-reopens-refurbishment-2026',
    excerpt:
      'The Dolphin on King Edward Road in Tynemouth has reopened following a transformational community pub refurbishment worth around £169,000.',
    keywords: 'Dolphin Tynemouth, North Shields pubs, Tynemouth pubs, Admiral Taverns, community pubs North East',
    imageUrl: '/assets/images/news/dolphin-tynemouth-community-pub-2026.jpg',
    publishedAt: new Date('2026-08-20T11:00:00Z'),
    content: `
<p>North East drinkers can return to The Dolphin in Tynemouth after a major community-focused refurbishment completed in August 2026.</p>
<h2>Investment in a Tynemouth favourite</h2>
<p>Admiral Taverns reported a transformational spend of around £168,877 on the King Edward Road site, refreshing the pub for locals, visitors and coastal footfall.</p>
<h2>Coastal pubs as year-round hubs</h2>
<p>Tynemouth’s hospitality scene thrives on weekend visitors and residents alike. Upgraded community pubs help the town keep spend on the high street beyond peak tourist days.</p>
<h2>Part of a wider reopenings wave</h2>
<p>The Dolphin’s return sits alongside other Admiral-backed reopenings this summer, showing targeted investment still reaches neighbourhood pubs outside London.</p>
`.trim(),
  },
  {
    title: 'UK Pubs Open Until 5am for England’s World Cup Match Against Mexico',
    slug: 'uk-pubs-open-5am-england-mexico-world-cup-2026',
    excerpt:
      'Pubs in England and Wales could serve until 5am on 6 July 2026 for England’s 1am World Cup last-16 tie against Mexico under a blanket licence extension.',
    keywords: 'World Cup pub opening hours 2026, England Mexico pubs, extended licensing hours, late night pubs UK',
    imageUrl: '/assets/images/news/pubs-extended-hours-world-cup-2026.jpg',
    publishedAt: new Date('2026-07-03T12:00:00Z'),
    content: `
<p>Football fans in England and Wales got rare late-night licences so they could watch England’s World Cup last-16 clash with Mexico without rushing last orders.</p>
<h2>What were the special pub hours?</h2>
<p>Because kick-off was at 1am BST in Mexico City, the government authorised pubs and bars to stay open until 5am on Monday 6 July 2026. Individual Temporary Event Notices were not required for that fixture.</p>
<h2>Boost for hospitality during the tournament</h2>
<p>Ministers framed the move as support for pubs after earlier knockout-stage extensions to 1am or 2am depending on kick-off time. Wet-led venues reported strong matchday spikes throughout July.</p>
<h2>Planning your next big-screen night</h2>
<p>Whether it is football or other live sport, UK Pubs helps you find venues with screens and atmosphere — start with our <a href="/venues">venue search</a>.</p>
`.trim(),
  },
  {
    title: 'Brains Opens The Old Brewery Pub in Cardiff’s Brewery Quarter',
    slug: 'brains-old-brewery-cardiff-pub-opens-august-2026',
    excerpt:
      'Brains has opened The Old Brewery in Cardiff’s historic Brewery Quarter, a new pub and beer experience on the site of its former St Mary’s Street brewery.',
    keywords: 'Old Brewery Cardiff, Brains pubs, Cardiff Brewery Quarter, pubs in Cardiff, Welsh pubs 2026',
    imageUrl: '/assets/images/news/brains-old-brewery-cardiff-2026.jpg',
    publishedAt: new Date('2026-08-24T15:00:00Z'),
    content: `
<p>Cardiff has a major new hospitality landmark: Brains’ The Old Brewery opened to the public on 24 August 2026 in the city’s Brewery Quarter.</p>
<h2>A homecoming for Brains beer</h2>
<p>Created with Heineken and Breaking Brands, the venue sits where Brains brewed on St Mary’s Street from 1882 until 1999. Guests can expect Brains cask and keg beers, Welsh spirits and a Welsh barbecue-led food offer.</p>
<h2>Immersive beer experience</h2>
<p>Features include multi-tap lager choices and a sports-friendly layout designed for matchdays and evenings out in the Welsh capital.</p>
<h2>Why Cardiff pub-goers should visit</h2>
<p>Few openings reconnect a city’s brewing heritage so directly with a modern pub format. The Old Brewery aims to become part of Cardiff’s weekend ritual again.</p>
<p>Discover more <a href="/town/cardiff">pubs in Cardiff</a>.</p>
`.trim(),
  },
  {
    title: 'Rhoderick Dhu Glasgow Pub Reopens After Six-Figure City Centre Refit',
    slug: 'rhoderick-dhu-glasgow-pub-reopens-august-2026',
    excerpt:
      'The Rhoderick Dhu on Waterloo Street, Glasgow reopened on 21 August 2026 after a six-figure Belhaven refurbishment with upgraded sports screens.',
    keywords: 'Rhoderick Dhu Glasgow, Glasgow city centre pubs, Belhaven pubs, sports pubs Glasgow, Waterloo Street',
    imageUrl: '/assets/images/news/rhoderick-dhu-glasgow-pub-reopens-2026.jpg',
    publishedAt: new Date('2026-08-21T13:00:00Z'),
    content: `
<p>Glasgow city centre’s Rhoderick Dhu is open again after a three-week, six-figure transformation completed in August 2026.</p>
<h2>What the Belhaven refurb delivered</h2>
<p>New flooring, lighting, furniture, toilets, signage and planters refresh the Waterloo Street site. Sports fans get better screens, sound and an extra outdoor TV for matchdays on Sky Sports and TNT Sports.</p>
<h2>Events space downstairs</h2>
<p>A refurbished basement room can host up to 80 guests with hot buffet options — useful for celebrations and after-work gatherings in the central business district.</p>
<h2>Back as a commuter and local hub</h2>
<p>Managers say the pub remains a stop for workers and locals seeking a drink, a meal or a big-screen fixture in the heart of Glasgow.</p>
`.trim(),
  },
  {
    title: 'Circle13 Cocktail Bar Opens in London Fields with Pétanque Courts',
    slug: 'circle13-cocktail-bar-london-fields-petanque-opens-2026',
    excerpt:
      'Circle13 has opened a permanent pétanque and highball cocktail bar under the railway arches on Helmsley Place in London Fields, Hackney.',
    keywords: 'Circle13 London Fields, Hackney cocktail bars, pétanque bar London, London Fields bars, experiential nightlife',
    imageUrl: '/assets/images/news/circle13-london-fields-cocktail-bar-2026.jpg',
    publishedAt: new Date('2026-08-19T10:30:00Z'),
    content: `
<p>East London’s competitive socialising scene has a new permanent home as Circle13 opens under the arches in London Fields.</p>
<h2>Pétanque meets highball cocktails</h2>
<p>Founded by hospitality veteran Marc Sarton Du Jonchay and pétanque champion Monty Quaia, Circle13 pairs indoor courts with an inclusive cocktail list that leads on zero-ABV highballs before stronger serves.</p>
<h2>Hackney licensing and community focus</h2>
<p>After summer pop-ups, the team secured a premises licence for Helmsley Place in late July 2026 and moved into a fixed archway site aimed at daytime takeaway, evening play and weekend events.</p>
<h2>Bars beyond the classic pub</h2>
<p>Activity bars are growing across London as operators chase experiences as well as pints. Circle13 shows how games, music and thoughtful drinks menus can build a neighbourhood crowd.</p>
`.trim(),
  },
  {
    title: 'Tom Kerridge to Open Georgie’s Bar at Corinthia London in September',
    slug: 'tom-kerridge-georgies-bar-corinthia-london-opens-2026',
    excerpt:
      'Chef Tom Kerridge will open Georgie’s Bar at Corinthia London on 5 September 2026, with a Martini club and UK craft beers beside his relaunched restaurant.',
    keywords: 'Georgie’s Bar London, Tom Kerridge bar, Corinthia London cocktails, Westminster bars, Martini bar London',
    imageUrl: '/assets/images/news/georgies-bar-corinthia-london-kerridge-2026.jpg',
    publishedAt: new Date('2026-08-20T16:00:00Z'),
    content: `
<p>Westminster hotel drinkers will soon have a new destination bar as Tom Kerridge prepares to unveil Georgie’s Bar at the Corinthia London.</p>
<h2>Martini club and classic cocktails</h2>
<p>Opening on 5 September 2026 alongside a redesigned Kerridge’s dining room, Georgie’s Bar will serve freezer Martinis — Dry, Wet, Dirty and the Steak Gibson — plus classics from Negroni to Espresso Martini.</p>
<h2>UK beer on draught</h2>
<p>Rebellion Brewery beers from Marlow, long linked with Kerridge’s pubs, will sit beside wines, spirits and a bar-food menu built for lingering drinks.</p>
<h2>Named after a Kerridge family dog</h2>
<p>The bar takes its name from Georgie, the chef’s boxer, whose paw print became a brand motif. For visitors seeking a polished London bar with pub-bred beer roots, the Corinthia launch is one to watch.</p>
`.trim(),
  },
]

async function main() {
  let created = 0
  let skipped = 0

  for (const article of articles) {
    const existing = await prisma.ukpubsNews.findUnique({ where: { slug: article.slug } })
    if (existing) {
      await prisma.ukpubsNews.update({
        where: { slug: article.slug },
        data: {
          title: article.title,
          excerpt: article.excerpt.slice(0, 500),
          content: article.content,
          imageUrl: article.imageUrl,
          authorName: 'UK Pubs News Desk',
          isFeatured: false,
          publishedAt: article.publishedAt,
        },
      })
      skipped++
      console.log(`updated: ${article.slug}`)
      continue
    }

    await prisma.ukpubsNews.create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt.slice(0, 500),
        content: article.content,
        imageUrl: article.imageUrl,
        authorName: 'UK Pubs News Desk',
        isFeatured: false,
        publishedAt: article.publishedAt,
      },
    })
    created++
    console.log(`created: ${article.slug}`)
  }

  console.log(`Done. created=${created} updated=${skipped}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
