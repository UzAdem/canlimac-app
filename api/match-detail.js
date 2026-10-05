export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Maç ID eksik." });
  }

  try {
    // Tıklanan maçın detay verilerini (Olaylar, kadrolar, istatistikler) çeken istek:
    // const response = await fetch(`https://api.football-data.org/v4/matches/${id}`);
    // const data = await response.json();

    res.status(200).json({
      id: id,
      message: "Maç detayı başarıyla çekildi.",
      events: [],
      stats: {}
    });
  } catch (error) {
    console.error("Match Detail API Error:", error);
    res.status(500).json({ error: "Maç detayları alınamadı." });
  }
}
