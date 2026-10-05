export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // Vercel / Cloudflare engeli olmayan ücretsiz ve açık maç API'si
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${targetDate}&s=Soccer`);

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const events = data.events || [];

    if (events.length === 0) {
      return res.status(200).json([]);
    }

    const grouped = {};

    events.forEach(event => {
      const leagueName = event.strLeague || 'Diğer Ligler';

      if (!grouped[leagueName]) {
        grouped[leagueName] = {
          league: leagueName,
          matches: []
        };
      }

      // Saat Formatı (SS:DK)
      const timeStr = event.strTime ? event.strTime.substring(0, 5) : '--:--';

      grouped[leagueName].matches.push({
        id: event.idEvent,
        time: timeStr,
        homeTeam: event.strHomeTeam || 'Ev Sahibi',
        awayTeam: event.strAwayTeam || 'Deplasman',
        homeScore: event.intHomeScore ?? 'v',
        awayScore: event.intAwayScore ?? '',
        homeLogo: event.strHomeTeamBadge || null,
        awayLogo: event.strAwayTeamBadge || null
      });
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error("Matches API Error:", error);
    res.status(500).json({ error: "Veriler çekilemedi." });
  }
}
