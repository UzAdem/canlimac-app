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
      return res.status(200).json({ events: [], statusDetail: 'Maç Sonu' });
    }

    const data = await response.json();

    const headerComp = data?.header?.competitions?.[0];
    const statusDetail = headerComp?.status?.type?.detail || 'Maç Sonu';

    // İlk Yarı Skoru
    let homeIY, awayIY;
    const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');

    if (homeComp?.linescores?.[0]?.value !== undefined && awayComp?.linescores?.[0]?.value !== undefined) {
      homeIY = homeComp.linescores[0].value;
      awayIY = awayComp.linescores[0].value;
    }

    const homeId = homeComp?.id;
    const homeName = homeComp?.team?.displayName || '';
    const awayName = awayComp?.team?.displayName || '';

    // Olaylar listesi
    const rawEvents = data?.keyEvents || [];
    const events = [];

    rawEvents.forEach(item => {
      const clock = item?.clock?.displayValue || item?.time?.displayValue || '';
      const typeId = String(item?.type?.id || '');
      const typeText = (item?.type?.text || '').toLowerCase();
      const text = item?.text || '';

      let icon = '📌';
      let typeLabel = 'Olay';

      // Gol kontrolü
      if (typeId === '1' || typeText.includes('goal')) {
        icon = '⚽';
        typeLabel = 'Gol';
        if (typeText.includes('own') || text.toLowerCase().includes('own goal')) {
          typeLabel = 'Kendi Kalesine Gol';
        } else if (typeText.includes('penalty')) {
          typeLabel = 'Penaltı Golü';
        }
      } 
      // Sarı Kart
      else if (typeId === '3' || typeText.includes('yellow')) {
        icon = '🟨';
        typeLabel = 'Sarı Kart';
      } 
      // Kırmızı Kart
      else if (typeId === '4' || typeText.includes('red')) {
        icon = '🟥';
        typeLabel = 'Kırmızı Kart';
      } 
      // Oyuncu Değişikliği
      else if (typeId === '2' || typeText.includes('sub') || text.includes('→')) {
        icon = '🔄';
        typeLabel = 'Oyuncu Değişikliği';
      }

      const isHome = item?.team?.id === homeId || (homeName && text.includes(homeName));
      const teamName = isHome ? homeName : awayName;

      let player = text;
      if (item?.participants?.[0]?.athlete?.displayName) {
        player = item.participants[0].athlete.displayName;
        if (item?.participants?.[1]?.athlete?.displayName) {
          player += ` → ${item.participants[1].athlete.displayName}`;
        }
      }

      events.push({
        clock,
        icon,
        typeLabel,
        player,
        teamName,
        isHome
      });
    });

    return res.status(200).json({
      statusDetail,
      homeIY,
      awayIY,
      events
    });

  } catch (error) {
    console.error('Match Detail API Error:', error);
    return res.status(200).json({ events: [], statusDetail: 'Maç Sonu' });
  }
}
