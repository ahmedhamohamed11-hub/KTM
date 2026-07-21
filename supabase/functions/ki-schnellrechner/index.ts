// ============================================================================
// KTM – KI-Schnellrechner (Supabase Edge Function)
// ============================================================================
// Nimmt die Raum-/Gerätedaten + den vorhandenen Materialkatalog entgegen und
// lässt eine KI die vollständige Materialliste (Rohre, Kabel, Kanal, Klein-
// material) zusammenstellen. Für Positionen, die im Katalog existieren, wird
// der echte Preis genutzt; fehlende Teile schätzt die KI.
//
// Der KI-API-Key liegt AUSSCHLIESSLICH hier auf dem Server (nie im Browser).
// In Supabase als Secret hinterlegen:  ANTHROPIC_API_KEY
// ============================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "KI ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt)." }, 500);
    }

    const { rooms, indoorDevices, outdoorDevice, catalog } = await req.json();

    // Katalog kompakt an die KI geben (nur Name, Kategorie, Einheit, Preis)
    const catalogText = (catalog || [])
      .map((m: any) => `${m.name} | ${m.category || ""} | ${m.unit || "Stk"} | ${m.price ?? "?"} EUR`)
      .join("\n");

    const roomsText = (rooms || [])
      .map((r: any, i: number) => `Raum ${i + 1}: ${r.area} m², Last ${r.load} kW, Leitungslänge ca. ${r.distance ?? "?"} m`)
      .join("\n");

    const prompt = `Du bist Kälte-/Klimatechnik-Meister und kalkulierst eine Split-Klimaanlage.

RÄUME:
${roomsText}

GEWÄHLTE GERÄTE:
Innengeräte: ${(indoorDevices || []).map((d: any) => d.name).join(", ") || "—"}
Außengerät: ${outdoorDevice?.name || "—"}

VERFÜGBARER MATERIALKATALOG (Name | Kategorie | Einheit | Preis):
${catalogText || "(leer)"}

AUFGABE:
Stelle die vollständige Materialliste für die Installation zusammen (ohne die
oben genannten Geräte selbst). Denke an: Kältemittelleitung (Saug-/Flüssig,
je Länge), Kommunikationskabel, Kondensatschlauch, Stromkabel, Kabelkanal,
Wandhalterung/Konsole, Kleinmaterial (Dübel, Schellen, Isolierung, Dichtband).

REGELN:
- Nutze für jede Position, wenn möglich, einen Artikel aus dem Katalog und
  dessen Preis (Feld "ausKatalog": true, "preis" = Katalogpreis).
- Fehlt ein Teil im Katalog, ergänze es mit realistischem Schätzpreis (EUR,
  österreichisches Preisniveau) und "ausKatalog": false.
- Mengen an die Leitungslänge/Raumzahl anpassen.

Antworte NUR mit JSON, keine Erklärung:
{"positionen":[{"name":"...","menge":0,"einheit":"m","preis":0,"ausKatalog":true}],"hinweis":"..."}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await aiRes.json();
    const text = (data.content || []).map((c: any) => c.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return json({ error: "KI-Antwort konnte nicht gelesen werden.", raw: text }, 502);
    }

    return json(parsed, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
