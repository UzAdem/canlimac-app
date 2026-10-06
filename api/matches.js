export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { date } = req.query;
  const targetDate = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${targetDate}`
    );

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.events || [];

    const grouped = {};

    events.forEach(event => {
      const leagueName = event.season?.slug || event.league?.name || 'Diğer Ligler';
      const competition = event.competitions?.[0];
      if (!competition) return;

      const homeComp = competition.competitors?.find(c => c.homeAway === 'home');
      const awayComp = competition.competitors?.find(c => c.homeAway === 'away');

      const status = competition.status?.type?.state; // 'pre', 'in', 'post'
      const matchDate = new Date(event.date);
      
      // Kesin olarak Türkiye Saati (TRT / UTC+3) dilimine göre saat formatı
      const timeStr = matchDate.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul' 
      });

      const matchObj = {
        id: event.id,
        time: status === 'in' ? (competition.status?.displayClock || 'Canlı') : timeStr,
        state: status,
        homeTeam: homeComp?.team?.displayName || 'Ev Sahibi',
        awayTeam: awayComp?.team?.displayName || 'Deplasman',
        homeLogo: homeComp?.team?.logo || '',
        awayLogo: awayComp?.team?.logo || '',
        homeScore: status !== 'pre' ? (homeComp?.score || '0') : null,
        awayScore: status !== 'pre' ? (awayComp?.score || '0') : null
      };

      if (!grouped[leagueName]) {
        grouped[leagueName] = [];
      }
      grouped[leagueName].push(matchObj);
    });

    const result = Object.keys(grouped).map(league => ({
      league: league.toUpperCase(),
      matches: grouped[league]
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Matches API Error:', error);
    return res.status(200).json([]);
  }
}
