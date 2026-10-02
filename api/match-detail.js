export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id, league } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Maç ID gerekli' });
  }

  // Lig kodunu tespit et veya varsayılan kullan
  const leagueSlug = league || 'uefa.nations';

  try {
    const response = await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${id}`);
    if (!response.ok) throw new Error('Veri çekilemedi');
    
    const data = await response.json();
    const competition = data.header.competitions[0];
    const home = competition.competitors.find(c => c.homeAway === 'home');
    const away = competition.competitors.find(c => c.homeAway === 'away');

    // 1. Olaylar (Goller ve Kartlar)
    const events = (data.keyEvents || []).map(item => ({
      clock: item.clock?.displayValue || '',
      type: item.type?.text || '', // Goal, Yellow Card, Red Card
      text: item.text || '',
      teamId: item.team?.id
    }));

    // 2. Kadrolar
    const rosters = (data.rosters || []).map(r => ({
      team: r.team.displayName,
      roster: (r.roster || []).map(p => ({
        name: p.athlete?.displayName,
        jersey: p.jersey,
        position: p.position?.abbreviation
      }))
    }));

    // 3. İstatistikler
    const stats = (data.boxscore?.statistics || []).map(s => ({
      name: s.name,
      label: s.label,
      homeValue: s.homeValue,
      awayValue: s.awayValue
    }));

    res.status(200).json({
      matchInfo: {
        homeTeam: home.team.displayName,
        awayTeam: away.team.displayName,
        homeScore: home.score ?? '-',
        awayScore: away.score ?? '-',
        status: competition.status.type.detail,
        venue: competition.venue?.fullName || ''
      },
      events,
      rosters,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Maç detayı alınamadı.' });
  }
      }

