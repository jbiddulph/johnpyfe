-- Featured news article: Runcorn Guinness depot theft (31 August 2026)
-- Only one article should be featured at a time.
UPDATE ukpubs_news
SET is_featured = false
WHERE is_featured = true
  AND slug <> 'runcorn-guinness-theft-cheshire-depot-2026';

INSERT INTO ukpubs_news (
    id,
    title,
    slug,
    excerpt,
    content,
    image_url,
    author_name,
    is_featured,
    published_at,
    created_at,
    updated_at
) VALUES (
    '660e8400-e29b-41d4-a716-446655440002',
    '800 barrels of Guinness bound for pubs stolen from Runcorn depot',
    'runcorn-guinness-theft-cheshire-depot-2026',
    'Thieves drove two HGV trailers loaded with about 70,000 pints of Guinness out of a Runcorn depot on Monday evening. The stout, destined for pubs, is valued at around £115,000. Cheshire Police are appealing for witnesses and dashcam footage.',
    $article$<p>Two trailer-loads of Guinness meant for pub cellars have been stolen from a depot in Runcorn, Cheshire Police have said, in a theft they put at more than 70,000 pints.</p>
<p>Around 800 barrels of the stout were taken from the Whitehouse Industrial Estate on Aston Lane on Monday 31 August 2026. Officers value the beer at about £115,000. Including the two trailers, the total loss is estimated at around £205,000.</p>
<h2>How the trailers were taken</h2>
<p>Police say a lorry entered the Aston Lane industrial estate at about 19:45 BST, hitched a trailer packed with barrels and left about ten minutes later towards the Mersey Gateway bridge.</p>
<p>A second lorry arrived at 21:12, coupled to another Guinness-loaded trailer and drove off at about 21:30 towards Rainhill and Watkinson Way.</p>
<p>Each barrel holds roughly 88 pints. Detectives say the consignment — around 70,400 pints in all — had been due to go out to pubs.</p>
<h2>What police want from the public</h2>
<p>Both vehicles are believed to have been driven by men. The first driver is described as white, with a short dark beard and a beanie hat. The second was wearing a cap.</p>
<p>The stolen trailers are white tri-axle curtain-siders carrying GXO logistics branding on the curtains and rear doors, with unique numbers in the top left of the rear doors: DL736 or DL542.</p>
<p>Diageo, which owns Guinness, has a packaging warehouse on the same estate.</p>
<p>Detective Sergeant McClatchy said: “It is famously said that Guinness is good for you, but that is only the case when it has been bought and paid for.” Officers say they want the beer and both trailers recovered in full.</p>
<p>Anyone with information, or motorists who were nearby and may have dashcam of either vehicle, is asked to contact Cheshire Police on 101 quoting incident IML-2408641, or via <a href="https://www.cheshire.police.uk">cheshire.police.uk</a>.</p>
<h2>What it means for pubs</h2>
<p>A theft on this scale will not empty every tap in the North West overnight, but it is a reminder of how tightly pub supply chains run. Kegs and barrels move from warehouse to cellar on tight delivery windows; losing hundreds of barrels at once can leave accounts short just as the weekend trade starts.</p>
<p>If your local is waiting on a Guinness drop this week, it may simply be a delayed lorry — or it may be part of the load that never left Cheshire legally. Landlords with unexpected shortages should speak to their wholesaler rather than assuming a missed order.</p>
<p>Browse pubs across Cheshire and the rest of the UK in our <a href="/venues">venue directory</a>, or start with listings in <a href="/county/cheshire">Cheshire</a>.</p>
<p><em>Photograph: a pint of Guinness at a bar, Michal Osmenda, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>.</em></p>$article$,
    '/assets/images/news/runcorn-guinness-theft-cheshire-depot-2026.jpg',
    'UK Pubs News Desk',
    true,
    '2026-09-04 08:00:00',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    author_name = EXCLUDED.author_name,
    is_featured = EXCLUDED.is_featured,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();
