export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = 'b7c05318e6f74af0a016b3e56c5e3015';

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  // İstediğiniz lig sıralamasını buraya yazabilirsiniz (Yukarıdan aşağıya doğru sıralanır)
  const LEAGUE_ORDER = [
    'Süper Lig',
    'UEFA Champions League',
    'Premier League',
    'La Liga',
    'Serie A',
    'Bundesliga',
    'Ligue 1',
    'UEFA Europa League',
    'Championship'
  ];

  try {
    const apiRes = await fetch(`https://api.football-data.org/v4/matches?date=${targetDate}`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (apiRes.status === 429) {
      return res.status(429).json({ error: 'Çok fazla istek atıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.' });
    }

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: 'API isteği başarısız oldu.' });
    }

    const data = await apiRes.json();

    if (!data.matches || data.matches.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = {};

    data.matches.forEach(m => {
      const rawLeagueName = m.competition.name;
      const leagueDisplayName = `${m.competition.emblem ? '' : '⚽ '} ${rawLeagueName}`;
      
      if (!grouped[rawLeagueName]) {
        grouped[rawLeagueName] = {
          league: leagueDisplayName,
          rawName: rawLeagueName,
          matches: []
        };
      }

      let statusType = 'UPCOMING';
      let minuteStr = new Date(m.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      if (['IN_PLAY', 'PAUSED'].includes(m.status)) {
        statusType = 'LIVE';
        minuteStr = 'CANLI';
      } else if (['FINISHED', 'AWARDED'].includes(m.status)) {
        statusType = 'FINISHED';
        minuteStr = 'MS';
      }

      grouped[rawLeagueName].matches.push({
        id: m.id,
        homeTeam: m.homeTeam.shortName || m.homeTeam.name,
        awayTeam: m.awayTeam.shortName || m.awayTeam.name,
        homeScore: m.score.fullTime.home ?? (m.score.halfTime.home ?? '-'),
        awayScore: m.score.fullTime.away ?? (m.score.halfTime.away ?? '-'),
        status: statusType,
        minute: minuteStr
      });
    });

    // Ligleri sizin belirlediğiniz öncelik sırasına göre dizme işlemi
    const sortedLeagues = Object.values(grouped).sort((a, b) => {
      const indexA = LEAGUE_ORDER.findIndex(l => a.rawName.toLowerCase().includes(l.toLowerCase()));
      const indexB = LEAGUE_ORDER.findIndex(l => b.rawName.toLowerCase().includes(l.toLowerCase()));

      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;

      return orderA - orderB;
    });

    res.status(200).json(sortedLeagues);
  } catch (error) {
    res.status(500).json({ error: 'Canlı veriler çekilirken bir sorun oluştu.' });
  }
}
