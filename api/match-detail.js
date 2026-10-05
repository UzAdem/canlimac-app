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
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json({ events: [], statusDetail: 'Maç Sonu', homeIY: undefined, awayIY: undefined });
    }

    const data = await response.json();

    const headerComp = data?.header?.competitions?.[0];
    const statusDetail = headerComp?.status?.type?.detail || 'Maç Sonu';

    // İlk Yarı Skoru
    let homeIY = undefined;
    let awayIY = undefined;
    
    try {
      const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
      const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');

      if (homeComp?.linescores?.[0]?.value !== undefined && awayComp?.linescores?.[0]?.value !== undefined) {
        homeIY = homeComp.linescores[0].value;
        awayIY = awayComp.linescores[0].value;
      }
    } catch (e) {
      console.log('Linescores read error:', e);
    }

    const homeComp = headerComp?.competitors?.find(c => c.homeAway === 'home');
    const homeId = homeComp?.id;
    const homeName = homeComp?.team?.displayName || '';
    const awayComp = headerComp?.competitors?.find(c => c.homeAway === 'away');
    const awayName = awayComp?.team?.displayName || '';

    // Olaylar
    const rawEvents = data?.keyEvents || [];
    const events = [];

    rawEvents.forEach(item => {
      try {
        const clock = item?.clock?.displayValue || item?.time?.displayValue || '';
        const typeId = String(item?.type?.id || '');
        const typeText = String(item?.type?.text || '').toLowerCase();
        const text = String(item?.text || '');

        let icon = '📌';
        let typeLabel = 'Olay';

        if (typeId === '1' || typeText.includes('goal')) {
          icon = '⚽';
          typeLabel = 'Gol';
          if (typeText.includes('own') || text.toLowerCase().includes('own goal')) {
            typeLabel = 'Kendi Kalesine Gol';
          } else if (typeText.includes('penalty')) {
            typeLabel = 'Penaltı Golü';
          }
        } else if (typeId === '3' || typeText.includes('yellow')) {
          icon = '🟨';
          typeLabel = 'Sarı Kart';
        } else if (typeId === '4' || typeText.includes('red')) {
          icon = '🟥';
          typeLabel = 'Kırmızı Kart';
        } else if (typeId === '2' || typeText.includes('sub') || text.includes('→')) {
          icon = '🔄';
          typeLabel = 'Oyuncu Değişikliği';
        }

        const
          
