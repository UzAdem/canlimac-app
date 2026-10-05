export default async function handler(req, res) {
  const { date } = req.query;

  try {
    // Örnek mock veri / API çağrısı
    // Kendi veri kaynağınıza göre düzenleyebilirsiniz.
    const matchesData = [
      {
        league: "Trendyol Süper Lig",
        matches: [
          {
            id: "m1",
            time: "20:00",
            homeTeam: "Galatasaray",
            awayTeam: "Fenerbahçe",
            homeScore: 1,
            awayScore: 1,
            isStarted: true,
            status: "in",
            leagueSlug: "super-lig"
          }
        ]
      }
    ];

    res.status(200).json(matchesData);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Maçlar yüklenirken bir hata oluştu." });
  }
}
