export default async function handler(req, res) {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { date } = req.query; // YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];
  const formattedDate = targetDate.replace(/-/g, '');

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${formattedDate}`
    );
    
    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const groupedMatches = {};

    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        const leagueName = event.league?.name || 'Diğer Ligler';
        const competition = event.competitions?.[0];
        if (!competition) return;

        const homeCompetitor = competition.competitors?.find(c => c.homeAway === 'home');
        const awayCompetitor = competition.competitors?.find(c => c.homeAway === 'away');

        const matchObj = {
          id: event.id,
          time: new Date(event.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          homeTeam: homeCompetitor?.team?.displayName || 'Ev Sahibi',
          awayTeam: awayCompetitor?.team?.displayName || 'Deplasman',
          homeLogo: homeCompetitor?.team?.logo || '',
          awayLogo: awayCompetitor?.team?.logo || '',
          homeScore: homeCompetitor?.score ?? 'v',
          awayScore: awayCompetitor?.score ?? 'v',
          status: competition.status?.type?.shortDetail || 'MS'
        };

        if (!groupedMatches[leagueName]) {
          groupedMatches[leagueName] = [];
        }
        groupedMatches[leagueName].push(matchObj);
      });
    }

    const result = Object.keys(groupedMatches).map(league => ({
      league: league,
      matches: groupedMatches[league]
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json([]);
  }
}
