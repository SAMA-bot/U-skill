import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const PATH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    estimated_hours: { type: "number" },
    target_audience: { type: "string" },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          lessons: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                xp_reward: { type: "number" },
                duration_minutes: { type: "number" },
                content: { type: "string" },
              },
              required: ["title", "description", "xp_reward", "duration_minutes", "content"],
            },
          },
        },
        required: ["title", "description", "lessons"],
      },
    },
  },
  required: ["title", "description", "difficulty", "estimated_hours", "target_audience", "modules"],
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "AI service is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Session expired. Please log in again." }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // Only admins and HODs may author learning paths
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles || []).some((r: { role: string }) => r.role === "admin" || r.role === "hod");
    if (!allowed) return json({ error: "You do not have permission to create learning paths." }, 403);

    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic ?? "").trim();
    if (!topic || topic.length > 200) return json({ error: "Please provide a topic (max 200 characters)." }, 400);

    const moduleCount = Math.min(Math.max(Number(body.moduleCount) || 3, 1), 8);
    const lessonsPerModule = Math.min(Math.max(Number(body.lessonsPerModule) || 3, 1), 8);
    const difficulty = ["beginner", "intermediate", "advanced"].includes(body.difficulty)
      ? body.difficulty
      : "beginner";
    const audience = String(body.audience ?? "College faculty members").slice(0, 200);
    const notes = String(body.notes ?? "").slice(0, 1000);

    const prompt = [
      `Design a structured faculty-development learning path on: "${topic}".`,
      `Difficulty: ${difficulty}. Target audience: ${audience}.`,
      `Produce exactly ${moduleCount} modules with exactly ${lessonsPerModule} lessons each, ordered from foundations to application.`,
      `Each lesson needs: a specific title, a one-sentence description, xp_reward between 10 and 50, duration_minutes between 10 and 60,`,
      `and "content": 150-250 words of practical teaching notes in plain text (no markdown headings).`,
      `estimated_hours must be the realistic total study time in hours.`,
      notes ? `Additional requirements from the author: ${notes}` : "",
    ].filter(Boolean).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: "You are an instructional designer for higher-education faculty development programmes." }],
          },
          { role: "user", content: [{ type: "input_text", text: prompt }] },
        ],
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "learning_path",
            strict: true,
            schema: PATH_SCHEMA,
          },
        },
      }),
    });

    if (!aiRes.ok || !aiRes.body) {
      const detail = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, detail);
      if (aiRes.status === 429) return json({ error: "AI is busy right now. Please retry in a moment." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      return json({ error: "Could not generate the learning path. Please try again." }, 502);
    }

    // Read the SSE stream and accumulate the output text.
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            const full = Array.isArray(evt.response.output_text)
              ? evt.response.output_text.join("")
              : String(evt.response.output_text);
            if (full.length > text.length) text = full;
          }
        } catch {
          // ignore keep-alive / non-JSON frames
        }
      }
    }

    if (!text.trim()) return json({ error: "The AI returned an empty plan. Please try again." }, 502);

    let plan: unknown;
    try {
      plan = JSON.parse(text);
    } catch {
      console.error("Unparseable AI output", text.slice(0, 500));
      return json({ error: "The AI returned an unreadable plan. Please try again." }, 502);
    }

    return json({ plan });
  } catch (error) {
    console.error("generate-learning-path failed", error);
    return json({ error: "Unexpected error while generating the learning path." }, 500);
  }
});
