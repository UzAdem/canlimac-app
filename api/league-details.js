module.exports = async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'League slug is required' });
  }

  try {
    // 1. Puan Durumu Çekme
    const standingsUrl = `https://site.web.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
    const standingsRes = await fetch(standingsUrl);
    let standingsData = [];

    if (standingsRes.ok) {
      const sJson = await standingsRes.json();
      const entries = sJson.children?.[0]?.standings?.entries || sJson.standings?.entries || [];
      
      standingsData = entries.map(entry => {
        const stats = entry.stats.reduce((acc, curr) => {
          acc[curr.name] = curr.displayValue;
          return acc;
        }, {});

        return {
          rank: entry.stats.find(s => s.name === 'rank')?.value || '-',
          team: entry.team.displayName,
          logo: entry.team.logos?.[0]?.href || '',
          played: stats.gamesPlayed || '0',
          wins: stats.wins || '0',
          draws: stats.ties || '0',
          losses: stats.losses || '0',
          goalsFor: stats.pointsFor || '0',
          goalsAgainst: stats.pointsAgainst || '0',
          goalDifference: stats.pointDifferential || '0',
          points: stats.points || '0'
        };
      });
    }

    // 2. İstatistikler (Gol & Asist Krallığı)
    const leadersUrl = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/leaders`;
    const leadersRes = await fetch(leadersUrl);
    let goals = [];
    let assists = [];

    if (leadersRes.ok) {
      const lJson = await leadersRes.json();
      const categories = lJson.leaders || lJson.categories || [];

      categories.forEach(cat => {
        const catName = (cat.name || cat.displayName || '').toLowerCase();
        
        // Gol Krallığı Kriterleri
        if (catName.includes('goal') || catName.includes('scoring') || catName === 'g') {
          goals = (cat.leaders || []).map(item => ({
            rank: item.rank || '-',
            player: item.athlete?.displayName || item.athlete?.fullName || 'Bilinmiyor',
            team: item.athlete?.team?.displayName || item.team?.displayName || '',
            value: item.displayValue || item.value || '0'
          }));
        }

        // Asist Krallığı Kriterleri
        if (catName.includes('assist') || catName === 'a') {
          assists = (cat.leaders || []).map(item => ({
            rank: item.rank || '-',
            player: item.athlete?.displayName || item.athlete?.fullName || 'Bilinmiyor',
            team: item.athlete?.team?.displayName || item.team?.displayName || '',
            value: item.displayValue || item.value || '0'
          }));
        }
      });
    }

    res.status(200).json({
      standings: standingsData,
      leaders: {
        goals: goals,
        assists: assists
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Lig detayları alınamadı.' });
  }
};
        
