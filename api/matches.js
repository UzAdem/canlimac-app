export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { date } = req.query;
  const targetDate = date ? date.replace(/-/g, '') : '20261006';

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${targetDate}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data?.events || [];
    const leaguesMap = {};

    events.forEach(ev => {
      const competition = ev?.competitions?.[0];
      if (!competition) return;

      // Lig adını ESPN'in farklı yapı taşlarından güvenli bir şekilde çekiyoruz
      const leagueName = ev?.league?.name || 
                         competition?.league?.name || 
                         ev?.tournament?.name || 
                         competition?.tournament?.name || 
                         (competition?.type && competition.type.name) || 
                         'Diğer Ligler';

      const competitors = competition?.competitors || [];
      const homeComp = competitors.find(c => c.homeAway === 'home');
      const awayComp = competitors.find(c => c.homeAway === 'away');

      if (!homeComp || !awayComp) return;

      const matchId = ev.id;
      const homeTeam = homeComp?.team?.displayName || 'Ev Sahibi';
      const homeLogo = homeComp?.team?.logo || '';
      const homeId = homeComp?.team?.id || '';
      const homeScore = homeComp?.score || '0';

      const awayTeam = awayComp?.team?.displayName || 'Deplasman';
      const awayLogo = awayComp?.team?.logo || '';
      const awayId = awayComp?.team?.id || '';
      const awayScore = awayComp?.score || '0';

      const statusType = competition?.status?.type?.state; 
      let state = 'pre';
      if (statusType === 'in') state = 'in';
      else if (statusType === 'post') state = 'post';

      const time = competition?.status?.type?.detail || ev?.date || '';

      if (!leaguesMap[leagueName]) {
        leaguesMap[leagueName] = [];
      }

      leaguesMap[leagueName].push({
        id: matchId,
        homeTeam,
        homeLogo,
        homeId,
        homeScore,
        awayTeam,
        awayLogo,
        awayId,
        awayScore,
        state,
        time
      });
    });

    let result = Object.keys(leaguesMap).map(league => ({
      league,
      matches: leaguesMap[league]
    }));

    // İstediğin özel sıralama önceliği
    const getPriority = (leagueName) => {
      const name = leagueName.toLowerCase();
      if (name.includes('süper lig') || name.includes('turkish') || name.includes('turkey')) return 1;
      if (name.includes('premier league') || name.includes('premier') || name.includes('england')) return 2;
      if (name.includes('laliga') || name.includes('la liga') || name.includes('spanish') || name.includes('spain')) return 3;
      if (name.includes('serie a') || name.includes('italian') || name.includes('italy')) return 4;
      if (name.includes('bundesliga') || name.includes('german') || name.includes('germany')) return 5;
      if (name.includes('ligue 1') || name.includes('french') || name.includes('france')) return 6;
      return 100; // Diğer ligler en sonda
    };

    result.sort((a, b) => {
      const pA = getPriority(a.league);
      const pB = getPriority(b.league);
      if (pA !== pB) return pA - pB;
      return a.league.localeCompare(b.league);
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Matches API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
