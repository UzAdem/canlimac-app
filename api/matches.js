export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query;
  const formattedDate = date ? date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');

  const LEAGUES = [
    { slug: 'uefa.nations', region: 'Avrupa', defaultName: 'UEFA Uluslar Ligi' },
    { slug: 'fifa.friendly', region: 'Dünya', defaultName: 'Hazırlık Maçları' },
    { slug: 'uefa.euro.q', region: 'Avrupa', defaultName: 'Euro Elemeleri' },
    { slug: 'tur.1', region: 'Türkiye', defaultName: 'Süper Lig' },
    { slug: 'eng.1', region: 'İngiltere', defaultName: 'Premier League' },
    { slug: 'esp.1', region: 'İspanya', defaultName: 'La Liga' },
    { slug: 'ger.1', region: 'Almanya', defaultName: 'Bundesliga' },
    { slug: 'ita.1', region: 'İtalya', defaultName: 'Serie A' }
  ];

  try {
    const fetchPromises = LEAGUES.map(league =>
      fetch(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${formattedDate}`)
        .then(r => r.ok ? r.json() : { events: [] })
        .then(data => ({ leagueInfo: league, events: data.events || [] }))
    );

    const results = await Promise.all(fetchPromises);
    const groupedMap = {};

    results.forEach(item => {
      if (item.events && item.events.length > 0) {
        item.events.forEach(event => {
          const competition = event.competitions[0];
          const home = competition.competitors.find(c => c.homeAway === 'home');
          const away = competition.competitors.find(c => c.homeAway === 'away');

          // Maçkolik tarzı grup / aşama adını tespit etme
          let groupDetail = '';
          if (competition.type && competition.type.text) {
            groupDetail = ` ${competition.type.text}`;
          } else if (event.season && event.season.slug) {
            groupDetail = ` ${event.season.slug}`;
          }

          // Örn: "Avrupa - UEFA Uluslar Ligi Lig A Grup 1"
          const fullLeagueTitle = `${item.leagueInfo.region} - ${item.leagueInfo.defaultName}${groupDetail}`;

          if (!groupedMap[fullLeagueTitle]) {
            groupedMap[fullLeagueTitle] = {
              league: fullLeagueTitle,
              matches: []
            };
          }

          const statusState = event.status.type.state;
          let statusType = 'UPCOMING';
          let minuteStr = new Date(event.date).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
          });

          if (statusState === 'in') {
            statusType = 'LIVE';
            minuteStr = `${event.status.displayClock || 'CANLI'}`;
          } else if (statusState === 'post') {
            statusType = 'FINISHED';
            minuteStr = 'MS';
          }

          groupedMap[fullLeagueTitle].matches.push({
            id: event.id,
            homeTeam: home.team.displayName,
            awayTeam: away.team.displayName,
            homeScore: home.score ?? '-',
            awayScore: away.score ?? '-',
            status: statusType,
            minute: minuteStr,
            venue: competition.venue ? competition.venue.fullName : ''
          });
        });
      }
    });

    res.status(200).json(Object.values(groupedMap));
  } catch (error) {
    res.status(500).json({ error: 'Veriler çekilirken bir sorun oluştu.' });
  }
}
