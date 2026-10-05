export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // YYYY-MM-DD

  try {
    // Nesine Bülten API
    const response = await fetch('https://bulten.nesine.com/api/bulten/v1/getbultenfull', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.Events || [];

    const grouped = {};

    events.forEach(item => {
      const leagueName = item.LN || 'Diğer Ligler';

      if (!grouped[leagueName]) {
        grouped[leagueName] = {
          league: leagueName,
          matches: []
        };
      }

      // Tarih ve Saat Ayarlama
      const matchTime = item.D ? item.D.substring(11, 16) : '--:--';

      grouped[leagueName].matches.push({
        id: item.C || item.N,
        time: matchTime,
        homeTeam: item.HN || 'Ev Sahibi',
        awayTeam: item.AN || 'Deplasman',
        homeScore: item.HS ?? 'v',
        awayScore: item.AS ?? '',
        homeLogo: item.HID ? `https://st1.nesine.com/imgs/teams/${item.HID}.png` : null,
        awayLogo: item.AID ? `https://st1.nesine.com/imgs/teams/${item.AID}.png` : null
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error("Matches Error:", error);
    res.status(500).json({ error: "Veriler çekilemedi." });
  }
}
