export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query; // YYYY-MM-DD
  const targetDate = date || new Date().toISOString().split('T')[0];
  const formattedDate = targetDate.replace(/-/g, '');

  const leagueEndpoints = [
    { code: 'tur.1', name: 'Süper Lig' },
    { code: 'eng.1', name: 'İngiltere Premier Lig' },
    { code: 'esp.1', name: 'İspanya La Liga' },
    { code: 'ita.1', name: 'İtalya Serie A' },
    { code: 'ger.1', name: 'Almanya Bundesliga' },
    { code: 'fra.1', name: 'Fransa Ligue 1' },
    { code: 'uefa.champions', name: 'UEFA Şampiyonlar Ligi' },
    { code: 'uefa.europa', name: 'UEFA Avrupa Ligi' },
    { code: 'uefa.nations', name: 'UEFA Uluslar Ligi' },
    { code: 'usa.1', name: 'ABD MLS' },
    { code: 'fifa.friendly', name: 'Hazırlık Maçları' }
  ];

  try {
    const requests = leagueEndpoints.map(l => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l.code}/scoreboard?dates=${formattedDate}`)
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
    );

    const results = await Promise.all(requests);
    const grouped = [];

    results.forEach((data, index) => {
      if (!data || !data.events || data.events.length === 0) return;

      const leagueName = leagueEndpoints[index].name;
      const matches = [];

      data.events.forEach(event => {
        const competition = event.competitions?.[0];
        const home = competition?.competitors?.find(c => c.homeAway === 'home');
        const away = competition?.competitors?.find(c => c.homeAway === 'away');

        // Türkiye Saat Dilimine (Europe/Istanbul) Göre Saati Biçimlendirme
        const matchDate = new Date(event.date);
        const turkishTime = matchDate.toLocaleTimeString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const isStarted = event.status?.type?.state === 'in' || event.status?.type?.state === 'post';
        const homeScore = isStarted ? (home?.score ?? '0') : 'v';
        const awayScore = isStarted ? (away?.score ?? '0') : '';

        matches.push({
          id: event.id,
          time: turkishTime,
          homeTeam: home?.team?.displayName || 'Ev Sahibi',
          awayTeam: away?.team?.displayName || 'Deplasman',
          homeScore: homeScore,
          awayScore: awayScore,
          homeLogo: home?.team?.logo || null,
          awayLogo: away?.team?.logo || null
        });
      });

      if (matches.length > 0) {
        grouped.push({
          league: leagueName,
          matches: matches
        });
      }
    });

    res.status(200).json(grouped);
  } catch (error) {
    console.error("Matches API Error:", error);
    res.status(500).json({ error: "Veriler çekilemedi." });
  }
}
