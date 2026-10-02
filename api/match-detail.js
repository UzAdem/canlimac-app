export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id, league } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Maç ID gerekli' });
  }

  const leagueSlug = league || 'uefa.nations';

  try {
    const response = await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${id}`);
    if (!response.ok) throw new Error('Veri çekilemedi');
    
    const data = await response.json();

    const rosters = (data.rosters || []).map(r => ({
      team: r.team.displayName,
      roster: (r.roster || []).map(p => ({
        name: p.athlete?.displayName || 'Oyuncu',
        jersey: p.jersey || '',
        position: p.position?.abbreviation || ''
      }))
    }));

    res.status(200).json({ rosters });
  } catch (error) {
    res.status(500).json({ rosters: [] });
  }
}
