export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Football-Data API Anahtarı
  const API_KEY = '7b2014603ee94faeb7dd90f5c1d3bf5b';

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const apiRes = await fetch(`https://api.football-data.org/v4/matches?date=${targetDate}`, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    if (!apiRes.ok) {
      return res.status(200).json([]);
    }

    const data = await apiRes.json();

    if (!data.matches || data.matches.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = {};

    data.matches.forEach(item => {
      const leagueName = item.competition.name;
      const country = item.competition.area ? item.competition.area.name : '';
      const leagueDisplayName = `${country ? country + ' - ' : ''}${leagueName}`;

      if (!grouped[leagueDisplayName]) {
        grouped[leagueDisplayName] = {
          league: leagueDisplayName,
          matches: []
        };
      }

      let statusType = 'UPCOMING';
      let minuteStr = new Date(item.utcDate).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
      });

      if (['IN_PLAY', 'PAUSED'].includes(item.status)) {
        statusType = 'LIVE';
        minuteStr = 'CANLI';
      } else if (item.status === 'FINISHED') {
        statusType = 'FINISHED';
        minuteStr = 'MS';
      }

      grouped[leagueDisplayName].matches.push({
        id: item.id,
        homeTeam: item.homeTeam.shortName || item.homeTeam.name,
        awayTeam: item.awayTeam.shortName || item.awayTeam.name,
        homeScore: item.score.fullTime.home ?? '-',
        awayScore: item.score.fullTime.away ?? '-',
        status: statusType,
        minute: minuteStr
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: 'Veriler çekilirken bir sorun oluştu.' });
  }
}
