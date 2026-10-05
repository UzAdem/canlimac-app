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
      return res.status(200).json({ events: [], statusDetail: 'Maç Detayı Bulunamadı' });
    }

    const data = await response.json();

    // Maç Durumu ve İY Skoru
    const headerComp = data.header?.competitions?.[0];
    const statusDetail = headerComp?.status?.type?.detail || 'Maç Sonu';

    // İlk Yarı Skoru bulma
    let homeIY = undefined;
    let awayIY = undefined;
    const homeLines = headerComp?.competitors?.find(c => c.homeAway === 'home')?.linescores;
    const awayLines = headerComp?.competitors?.find(c => c.homeAway === 'away')?.linescores;

    if (homeLines && homeLines.length > 0 && awayLines && awayLines.length > 0) {
      homeIY = homeLines[0]?.value;
      awayIY = awayLines[0]?.value;
    }

    // Takım bilgileri
    const homeId = headerComp?.competitors?.find(c => c.homeAway === 'home')?.id;
    const homeName = headerComp?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName || 'Ev Sahibi';
    const awayName = headerComp?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName || 'Deplasman';

    // Olayları ayrıştırma
    const rawKeyEvents = data.keyEvents || [];
    const events = [];

    rawKeyEvents.forEach(item => {
      const clock = item.clock?.displayValue || item.time?.displayValue || '';
      const typeId = item.type?.id || '';
      const text = item.text || '';
      const typeText = item.type?.text?.toLowerCase() || '';

      let icon = '📌';
      let typeLabel = 'Olay';

      // Gol kontrolü
      if (typeId === '1' || typeText.includes('goal') || typeText.includes('penalty - scored')) {
        icon = '⚽';
        typeLabel = 'Gol';
        if (typeText.includes('own goal') || text.toLowerCase().includes('own goal')) {
          typeLabel = 'Kendi Kalesine Gol';
        } else if (typeText.includes('penalty')) {
          typeLabel = 'Penaltı Golü';
        }
      } 
      // Sarı Kart
      else if (typeId === '3' || typeText.includes('yellow card')) {
        icon = '🟨';
        typeLabel = 'Sarı Kart';
      } 
      // Kırmızı Kart
      else if (typeId === '4' || typeText.includes('red card')) {
        icon = '🟥';
        typeLabel = 'Kırmızı Kart';
      } 
      // Oyuncu Değişikliği
      else if (typeId === '2' || typeText.includes('substitution') || text.includes
               
