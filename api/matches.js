export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query;
  const formattedDate = date ? date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Kulüp ve Milli Takım Lig Kodları
  const LEAGUES = [
    { slug: 'fifa.nations', name: 'UEFA Uluslar Ligi / Milli Maçlar' },
    { slug: 'fifa.friendly', name: 'Hazırlık Maçları (Milli)' },
    { slug: 'tur.1', name: 'Türkiye - Süper Lig' },
    { slug: 'eng.1', name: 'İngiltere - Premier League' },
    { slug: 'esp.1', name: 'İspanya - La Liga' },
    { slug: 'ger.1', name: 'Almanya - Bundesliga' },
    { slug: 'ita.1', name: 'İtalya - Serie A' }
  ];

  try {
    const fetchPromises = LEAGUES.map(league =>
      fetch(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${formattedDate}`)
        .then(r => r.ok ? r.json() : { events: [] })
        .then(data => ({ leagueName: league.name, events: data.events || [] }))
    );

    const results = await Promise.all(fetchPromises);
    const grouped = [];

    results.forEach(item => {
      if (item.events && item.events.length > 0) {
        const matches = item.events.map(event => {
          const competition = event.competitions[0];
          const home = competition.competitors.find(c => c.homeAway === 'home');
          const away = competition.competitors.find(c => c.homeAway === 'away');
          
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

          return {
            id: event.id,
            homeTeam: home.team.displayName,
            awayTeam: away.team.displayName,
            homeScore: home.score ?? '-',
            awayScore: away.score ?? '-',
            status: statusType,
            minute: minuteStr,
            venue: competition.venue ? competition.venue.fullName : ''
          };
        });

        grouped.push({
          league: item.leagueName,
          matches: matches
        });
      }
    });

    res.status(200).json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Veriler çekilirken bir sorun oluştu.' });
  }
}
