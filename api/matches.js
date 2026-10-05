export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { date } = req.query;
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

    function formatLeagueName(rawName) {
      if (!rawName) return 'Diğer Ligler';
      
      let clean = rawName.replace(/^\d{4}(-\d{2,4})?-/, '');
      clean = clean.replace(/-/g, ' ');

      clean = clean.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');

      const lower = clean.toLowerCase();
      if (lower.includes('super lig') || lower.includes('süper lig') || lower.includes('turkish super lig')) return 'Trendyol Süper Lig';
      if (lower.includes('premier league')) return 'Premier League';
      if (lower.includes('serie a')) return 'Serie A';
      if (lower.includes('laliga') || lower.includes('la liga')) return 'La Liga';
      if (lower.includes('bundesliga')) return 'Bundesliga';
      if (lower.includes('ligue 1')) return 'Ligue 1';
      if (lower.includes('regular season')) return 'Genel Lig / Turnuva';

      return clean || 'Diğer Ligler';
    }

    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        const competition = event.competitions?.[0];
        if (!competition) return;

        const rawLeague = 
          event.league?.name || 
          competition.league?.name || 
          event.season?.slug || 
          'Diğer Ligler';

        const leagueName = formatLeagueName(rawLeague);

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

    // Özel Lig Sıralaması
    const leagueOrder = [
      'Trendyol Süper Lig',
      'Premier League',
      'Serie A',
      'La Liga',
      'Bundesliga',
      'Ligue 1'
    ];

    const sortedLeagues = Object.keys(groupedMatches).sort((a, b) => {
      const indexA = leagueOrder.indexOf(a);
      const indexB = leagueOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return a.localeCompare(b, 'tr');
    });

    const result = sortedLeagues.map(league => ({
      league: league,
      matches: groupedMatches[league]
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json([]);
  }
}
