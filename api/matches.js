export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const API_KEY = 'b7c05318e6f74af0a016b3e56c5e3015';

  // İstekten gelen tarihi al (Yoksa bugünün tarihini al)
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const apiRes = await fetch(`https://api.football-data.org/v4/matches?date=${targetDate}`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!apiRes.ok) {
      throw new Error('API Hatası');
    }

    const data = await apiRes.json();

    const grouped = {};

    data.matches.forEach(m => {
      const leagueName = `${m.competition.emblem ? '' : '⚽ '} ${m.competition.name}`;
      
      if (!grouped[leagueName]) {
        grouped[leagueName] = {
          league: leagueName,
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

      grouped[leagueName].matches.push({
        id: m.id,
        homeTeam: m.homeTeam.shortName || m.homeTeam.name,
        awayTeam: m.awayTeam.shortName || m.awayTeam.name,
        homeScore: m.score.fullTime.home ?? (m.score.halfTime.home ?? '-'),
        awayScore: m.score.fullTime.away ?? (m.score.halfTime.away ?? '-'),
        status: statusType,
        minute: minuteStr
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: 'Canlı veriler çekilirken bir sorun oluştu.' });
  }
}
