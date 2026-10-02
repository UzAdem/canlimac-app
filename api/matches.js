export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = 'f15b9b2cf7882fafe5a7f2d4781ca8bf';

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const LEAGUE_PRIORITY = [
    'Super Lig',
    'UEFA Champions League',
    'UEFA Europa League',
    'Euro Championship',
    'World Cup',
    'Friendlies',
    'Premier League',
    'La Liga',
    'Serie A',
    'Bundesliga',
    '1. Lig',
    'Cup'
  ];

  try {
    // timezone=Europe/Istanbul eklenerek Türkiye saatine göre tam maç listesi çekilir
    const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${targetDate}&timezone=Europe/Istanbul`, {
      headers: {
        'x-apisports-key': API_KEY
      }
    });

    if (apiRes.status === 429) {
      return res.status(429).json({ error: 'Çok fazla istek atıldı. Lütfen birkaç saniye bekleyin.' });
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'API isteği başarısız oldu.' });
    }

    const data = await apiRes.json();

    // API bir hata mesajı döndüyse
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Error:', data.errors);
      return res.status(200).json([]);
    }

    if (!data.response || data.response.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = {};

    data.response.forEach(item => {
      const leagueName = item.league.name;
      const country = item.league.country;
      const leagueDisplayName = `${country ? country + ' - ' : ''}${leagueName}`;

      if (!grouped[leagueDisplayName]) {
        grouped[leagueDisplayName] = {
          league: leagueDisplayName,
          rawName: leagueName,
          matches: []
        };
      }

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

      grouped[leagueDisplayName].matches.push({
        id: item.fixture.id,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeScore: item.goals.home ?? '-',
        awayScore: item.goals.away ?? '-',
        status: statusType,
        minute: minuteStr
      });
    });

    const sortedLeagues = Object.values(grouped).sort((a, b) => {
      const indexA = LEAGUE_PRIORITY.findIndex(l => a.rawName.toLowerCase().includes(l.toLowerCase()));
      const indexB = LEAGUE_PRIORITY.findIndex(l => b.rawName.toLowerCase().includes(l.toLowerCase()));

      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;

      return orderA - orderB;
    });

    res.status(200).json(sortedLeagues);
  } catch (error) {
    res.status(500).json({ error: 'Canlı veriler çekilirken bir sorun oluştu.' });
  }
}
