-- Seed initial news article about vertical drinking
INSERT INTO ukpubs_news (
    id,
    title,
    slug,
    excerpt,
    content,
    author_name,
    is_featured,
    published_at,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'In Defence of Vertical Drinking: Why Standing at the Bar Matters',
    'defence-of-vertical-drinking',
    'Westminster Council''s move to ban "vertical drinking" in Soho pubs threatens a time-honoured British tradition. Is a pub that doesn''t allow standing a real pub at all?',
    '<p>Westminster Council is moving against "vertical drinking" in pubs, starting with Soho. It claims drinking standing up is noisy and disruptive. It makes pubs, the council says, boisterous places where customers crowd round bars, get drunk and become pains in the neck in the street outside.</p>

<p>The council''s new draft licences would require pubs to be only for seating, to have "table service in place of open bar space". Pub users should, presumably, sit down, shut up and wait to be served.</p>

<p>But here''s the thing: the reason the council apparently dislikes vertical drinking is the very reason Britons have done it forever. It is liquid sociability. It suits all sorts and ages. It encourages people to chat with strangers, pick arguments, and reduce traffic outside to a crawl. No one has to book tables or be turned away when it is "full". They can come and go, or stay all day.</p>

<h3>Pubs Under Threat</h3>

<p>British pubs are now closing fast. In the past 10 years roughly one has closed every day, to an all-time low of 39,000. Numbers have taken two big hits. The first was the loosening of planning laws that have allowed the change of use of licensed premises into housing.</p>

<p>The other hit was recent increases in business rates and jobs taxes, with its stamping out of casual youth employment. Some pubs faced bankruptcy overnight.</p>

<h3>The Social Value of Standing</h3>

<p>In urban areas across Britain, you''ll find pubs where the forecourt is "vertically" packed most evenings. The noise may be a nuisance to some, but these places are beacons for surrounding neighbourhoods. Old and young, elegant and shabby, British and foreign, all stand chatting inside and out. Argument and laughter echo down the street. They bring it to life.</p>

<p>If anything is vexing social intercourse at present, particularly among the young, it is the decline in human interaction. The villain is the mobile phone and social media. Recent studies show that the number of words people speak every day has declined dramatically – from over 16,000 in 2005 to under 12,000 in 2019. We have turned to silence. Online has replaced conversation.</p>

<h3>The Importance of Casual Conversation</h3>

<p>Experts are rightly calling the alarm. Talk matters to our brains. And that means talk in company. Nor is it just conversation that is important. It is casual conversation with people we do not know that needs mental effort. A chat with an old friend is easy, but with a stranger it is an exercise in community. That is the value of the pub exchange, of vertical drinking.</p>

<p>Some pubs are simply very crowded. Long may they be so. But some are where older people go daily just to be in company. These places are in effect A&E departments for the relief of loneliness, the endemic disease of our age.</p>

<h3>The Last Whirlpools of Social Connection</h3>

<p>As "village" institutions continue to decline, in town as well as country – the church, the old people''s club, the sports centre, the corner shop – are all disappearing as places of daily resort. We are retreating into ourselves. That the pub should go too, at the very moment of becoming the community''s last defining institution, is a tragedy.</p>

<p>Westminster may have problems with what it calls its West End "cumulative impact zone" – what we call crowds – but it should not take it out on the public house. As one pub after another closes at the bidding of the property market, these places should be fostered. They are more than fun. They are the last whirlpools of social connection before we all vanish online.</p>',
    'UK Pubs Editorial Team',
    true,
    '2026-08-07 12:00:00',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
