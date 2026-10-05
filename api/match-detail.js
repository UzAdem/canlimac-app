export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Maç ID gerekli." });
  }

  try {
    // Maç detayına özel istek
    res.status(200).json({
      id: id,
      status: "OK",
      events: [
        { minute: "12'", detail: "Gol!" },
        { minute: "34'", detail: "Sarı Kart" }
      ]
    });
  } catch (error) {
    console.error("Detail Error:", error);
    res.status(500).json({ error: "Detay çekilemedi." });
  }
}
