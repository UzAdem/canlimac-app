export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Team ID required' });
  }

  try {
    // ESPN Takım Bilgileri ve Son Maçları için API çağrısı
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${id}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json({ error: 'Team not found' });
    }

    const data = await response.json();
    const team = data?.team || {};

    const teamInfo = {
      id: team.id,
      name: team.displayName || team.name,
      shortName: team.shortDisplayName || team.abbreviation,
      logo: team.logo || team.logos?.[0]?.href || '',
      color: team.color ? `#${team.color}` : '#3b82f6',
      venue: team.venue?.fullName || 'Bilinmiyor',
      location: team.venue?.address?.city || '',
    };

    // Takımın Son Maçları (Eventleri)
    let matches = [];
    const eventsRef = team?.nextEvent || team?.record?.items?.[0]; // ESPN yapısına göre esnetilebilir
    // ESPN genellikle schedule endpoint'inde son maçları verir, alternatif olarak team schedule çekebiliriz:
    const schedResponse = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${id}/schedule`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    if (schedResponse.ok) {
      const schedData = await schedResponse.json();
      const events = schedData?.events || [];
      
      matches = events.slice(-5).map(ev => {
        const comp = ev?.competitions?.[0];
        const competitors = comp?.competitors || [];
        const homeComp = competitors.find(c => c.homeAway === 'home');
        const awayComp = competitors.find(c => c.awayAway === 'away' || c.homeAway === 'away');

        return {
          id: ev.id,
          date: ev.date,
          name: ev.name,
          homeTeam: homeComp?.team?.displayName,
          homeLogo: homeComp?.team?.logo,
          homeScore: homeComp?.score?.displayValue || '0',
          awayTeam: awayComp?.team?.displayName,
          awayLogo: awayComp?.team?.logo,
          awayScore: awayComp?.score?.displayValue || '0',
          status: comp?.status?.type?.completed ? 'MS' : 'İzleniyor'
        };
      });
    }

    return res.status(200).json({
      team: teamInfo,
      matches: matches
    });

  } catch (error) {
    console.error('Team Detail API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
      }
      
