export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query;

  try {
    // Canlı fikstür / Lig verilerini aldığınız API veya scraping servisi:
    // Örnek canlı veri entegrasyonu
    const response = await fetch(`https://api.football-data.org/v4/matches?date=${date || ''}`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY || '' }
    });

    if (!response.ok) {
      // Eğer harici servis hata verirse veya tarihe ait veri yoksa
      return res.status(200).json([]);
    }

    const data = await response.json();
    
    // Gelen veriyi ön yüzün beklediği formata göre döndürün
    res.status(200).json(data);
  } catch (error) {
    console.error("Matches API Error:", error);
    res.status(500).json({ error: "Fikstür çekilirken hata oluştu." });
  }
}
