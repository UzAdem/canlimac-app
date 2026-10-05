export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Maç ID zorunludur." });
  }

  try {
    // Örnek Maç Detay Verisi
    const detailData = {
      id: id,
      events: [
        { minute: "14'", team: "away", type: "card", player: "S. Gudelj", detail: "Sarı Kart" },
        { minute: "31'", team: "home", type: "goal", player: "T. Koopmeiners", detail: "Gol (1-0)" }
      ],
      stats: {
        "Topla Oynama": { home: "55%", away: "45%" },
        "Toplam Şut": { home: "12", away: "8" },
        "Isabetli Şut": { home: "5", away: "3" }
      }
    };

    res.status(200).json(detailData);
  } catch (error) {
    console.error("Detail API Error:", error);
    res.status(500).json({ error: "Maç detayı alınamadı." });
  }
}
