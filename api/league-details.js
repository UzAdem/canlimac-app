// SÜPER LİG VE POPÜLER LİGLER İÇİN GÜNCEL KART/GOL/ASİST VERİLERİ (FALLBACK)
const DEFAULT_LEADERS = {
  'tur.1': {
    goals: [
      { rank: 1, player: "Edin Džeko", team: "Fenerbahçe", value: "21" },
      { rank: 2, player: "Mauro Icardi", team: "Galatasaray", value: "20" },
      { rank: 3, player: "Rey Manaj", team: "Sivasspor", value: "18" },
      { rank: 4, player: "Mame Thiam", team: "Pendikspor", value: "16" },
      { rank: 5, player: "Krzysztof Piątek", team: "Başakşehir", value: "15" },
      { rank: 6, player: "Paul Onuachu", team: "Trabzonspor", value: "14" }
    ],
    assists: [
      { rank: 1, player: "Dries Mertens", team: "Galatasaray", value: "14" },
      { rank: 2, player: "Haris Hajradinović", team: "Kasımpaşa", value: "13" },
      { rank: 3, player: "Dušan Tadić", team: "Fenerbahçe", value: "12" },
      { rank: 4, player: "Deniz Türüç", team: "Başakşehir", value: "10" },
      { rank: 5, player: "Sebastian Szymański", team: "Fenerbahçe", value: "9" }
    ]
  },
  'eng.1': {
    goals: [
      { rank: 1, player: "Erling Haaland", team: "Manchester City", value: "27" },
      { rank: 2, player: "Cole Palmer", team: "Chelsea", value: "22" },
      { rank: 3, player: "Alexander Isak", team: "Newcastle United", value: "21" },
      { rank: 4, player: "Ollie Watkins", team: "Aston Villa", value: "19" }
    ],
    assists: [
      { rank: 1, player: "Ollie Watkins", team: "Aston Villa", value: "13" },
      { rank: 2, player: "Cole Palmer", team: "Chelsea", value: "11" },
      { rank: 3, player: "Kevin De Bruyne", team: "Manchester City", value: "10" }
    ]
  }
};

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
    let goals = [];
    let assists = [];

    try {
      const leadersUrl = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/leaders`;
      const leadersRes = await fetch(leadersUrl);

      if (leadersRes.ok) {
        const lJson = await leadersRes.json();
        const categories = lJson.leaders || lJson.categories || [];

        categories.forEach(cat => {
          const catName = (cat.name || cat.displayName || '').toLowerCase();
          
          if (catName.includes('goal') || catName.includes('scoring') || catName === 'g') {
            goals = (cat.leaders || []).map(item => ({
              rank: item.rank || '-',
              player: item.athlete?.displayName || item.athlete?.fullName || 'Bilinmiyor',
              team: item.athlete?.team?.displayName || item.team?.displayName || '',
              value: item.displayValue || item.value || '0'
            }));
          }

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
    } catch (e) {
      console.log('API leaders hatası:', e);
    }

    // Eğer API'den veri gelmediyse varsayılan veriyi yükle
    if (goals.length === 0 && DEFAULT_LEADERS[slug]?.goals) {
      goals = DEFAULT_LEADERS[slug].goals;
    }

    if (assists.length === 0 && DEFAULT_LEADERS[slug]?.assists) {
      assists = DEFAULT_LEADERS[slug].assists;
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
