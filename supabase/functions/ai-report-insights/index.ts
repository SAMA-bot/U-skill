import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { metrics } = await req.json();
    if (!metrics) {
      return new Response(JSON.stringify({ error: "Missing metrics" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        signal: controller.signal,
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a faculty performance analyst. Given performance metrics, produce a JSON object with exactly these keys:
- "summary": A 2-3 sentence performance summary paragraph.
- "strengths": Array of 3-4 specific strength statements based on the data.
- "improvements": Array of 3-4 specific areas needing improvement.
- "trainingPaths": Array of 3-4 objects each with "title" (training program name) and "reason" (why it's recommended), based on weak areas.

Return ONLY valid JSON. No markdown, no explanation. Base all insights on the actual metric values provided.`,
            },
            {
              role: "user",
              content: `Analyze these faculty performance metrics and generate insights:\n${JSON.stringify(metrics)}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error("AI gateway fetch failed:", fetchErr);
      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later.", fallback: true }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds.", fallback: true }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";

    let insights;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report-insights error:", e);
    return new Response(JSON.stringify({ fallback: true, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
