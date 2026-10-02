export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = 'f15b9b2cf7882fafe5a7f2d4781ca8bf';

  const { date, league } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Replit tarafında kullandığımız lig ID haritası
  const LEAGUE_MAP = {
    'super-lig': 203,
    'premier-league': 39,
    'la-liga': 140,
    'bundesliga': 78,
    'serie-a': 135,
    'tff-1-lig': 204
  };

  try {
    // Eğer ön yüzden belirli bir lig seçildiyse (Replit'teki menü mantığı)
    if (league && LEAGUE_MAP[league]) {
      const leagueId = LEAGUE_MAP[league];
      const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2026&date=${targetDate}&timezone=Europe/Istanbul`, {
        headers: { 'x-apisports-key': API_KEY }
      });

      const data = await apiRes.json();
      const matches = formatMatches(data.response || []);
      
      return res.status(200).json([{
        league: getLeagueTitle(league),
        matches: matches
      }]);
    }

    // Seçim yoksa öncelikli liglerin hepsini Replit usulü paralel sorgula
    const targetLeagues = Object.values(LEAGUE_MAP);
    const fetchPromises = targetLeagues.map(id =>
      fetch(`https://v3.football.api-sports.io/fixtures?league=${id}&season=2026&date=${targetDate}&timezone=Europe/Istanbul`, {
        headers: { 'x-apisports-key': API_KEY }
      }).then(r => r.ok ? r.json() : { response: [] })
    );

    const results = await Promise.all(fetchPromises);
    const grouped = [];

    results.forEach(resData => {
      if (resData.response && resData.response.length > 0) {
        const leagueName = `${resData.response[0].league.country} - ${resData.response[0].league.name}`;
        grouped.push({
          league: leagueName,
          matches: formatMatches(resData.response)
        });
      }
    });

    res.status(200).json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Veriler çekilirken bir sorun oluştu.' });
  }
}

function formatMatches(fixtures) {
  return fixtures.map(item => {
    const statusShort = item.fixture.status.short;
    let statusType = 'UPCOMING';
    let minuteStr = new Date(item.fixture.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort)) {
      statusType = 'LIVE';
      minuteStr = item.fixture.status.elapsed ? `${item.fixture.status.elapsed}'` : 'CANLI';
    } else if (['FT', 'AET', 'PEN'].includes(statusShort)) {
      statusType = 'FINISHED';
      minuteStr = 'MS';
    }

    return {
      id: item.fixture.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeScore: item.goals.home ?? '-',
      awayScore: item.goals.away ?? '-',
      status: statusType,
      minute: minuteStr,
      venue: item.fixture.venue.name || ''
    };
  });
}

function getLeagueTitle(slug) {
  const titles = {
    'super-lig': 'Türkiye - Süper Lig',
    'premier-league': 'İngiltere - Premier League',
    'la-liga': 'İspanya - La Liga',
    'bundesliga': 'Almanya - Bundesliga',
    'serie-a': 'İtalya - Serie A',
    'tff-1-lig': 'Türkiye - TFF 1. Lig'
  };
  return titles[slug] || 'Futbol';
}
