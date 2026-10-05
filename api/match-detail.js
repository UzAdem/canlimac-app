export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`
    );

    if (!response.ok) {
      return res.status(404).json({ error: 'Match details not found' });
    }

    const data = await response.json();
    const competition = data.header?.competitions?.[0];

    // İY / MS Skor Detayları
    const periodScores = competition?.competitors?.[0]?.linescores || [];
    const homeComp = competition?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = competition?.competitors?.find(c => c.homeAway === 'away');

    const homeIY = homeComp?.linescores?.[0]?.displayValue || '0';
    const awayIY = awayComp?.linescores?.[0]?.displayValue || '0';

    // Olay Tipi Belirleme ve İkon Atama
    const rawEvents = competition?.details || [];
    const formattedEvents = rawEvents.map(item => {
      const typeText = (item.type?.text || '').toLowerCase();
      let icon = '📌';
      let typeLabel = 'Olay';

      if (typeText.includes('goal') || typeText.includes('penalty')) {
        icon = '⚽';
        typeLabel = 'Gol';
      } else if (typeText.includes('yellow card')) {
        icon = '🟨';
        typeLabel = 'Sarı Kart';
      } else if (typeText.includes('red card')) {
        icon = '🟥';
        typeLabel = 'Kırmızı Kart';
      } else if (typeText.includes('substitution') || typeText.includes('sub')) {
        icon = '🔄';
        typeLabel = 'Oyuncu Değişikliği';
      }

      const teamId = item.team?.id;
      const isHome = teamId === homeComp?.id;

      return {
        clock: item.clock?.displayValue || '',
        icon,
        typeLabel,
        isHome,
        teamName: item.team?.displayName || '',
        player: item.participants?.map(p => p.athlete?.displayName).join(' ➔ ') || item.text || ''
      };
    });

    return res.status(200).json({
      homeTeam: homeComp?.team?.displayName || 'Ev Sahibi',
      awayTeam: awayComp?.team?.displayName || 'Deplasman',
      homeScore: homeComp?.score || '0',
      awayScore: awayComp?.score || '0',
      homeIY,
      awayIY,
      statusDetail: competition?.status?.type?.shortDetail || 'MS',
      events: formattedEvents
    });
  } catch (error) {
    console.error('Match Details API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
