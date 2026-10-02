export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = 'f15b9b2cf7882fafe5a7f2d4781ca8bf';

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Kapsamak istediğimiz liglerin ID'leri
  // 203: Süper Lig, 39: Premier League, 140: La Liga, 135: Serie A, 78: Bundesliga, 61: Ligue 1, 2: UCL, 3: UEL, 204: TFF 1. Lig
  const LEAGUES = [203, 39, 140, 135, 78, 61, 2, 3, 204];

  try {
    // 1. Önce genel tarih sorgusu atıyoruz
    const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${targetDate}&timezone=Europe/Istanbul`, {
      headers: { 'x-apisports-key': API_KEY }
    });

    let allFixtures = [];
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.response && data.response.length > 0) {
        allFixtures = data.response;
      }
    }

    // 2. Genel sorgu boş dönerse (geçmiş veya çok ileri tarihlerde ücretsiz plan sınırı nedeniyle),
    // Lig lig özel sorgu atarak geçmiş/gelecek maç verilerini çekiyoruz.
    if (allFixtures.length === 0) {
      const fetchPromises = LEAGUES.map(leagueId =>
        fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2026&date=${targetDate}&timezone=Europe/Istanbul`, {
          headers: { 'x-apisports-key': API_KEY }
        }).then(r => r.ok ? r.json() : { response: [] })
      );

      const results = await Promise.all(fetchPromises);
      results.forEach(resData => {
        if (resData.response && resData.response.length > 0) {
          allFixtures.push(...resData.response);
        }
      });
    }

    if (allFixtures.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = {};

    allFixtures.forEach(item => {
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

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: 'Canlı veriler çekilirken bir sorun oluştu.' });
  }
}
