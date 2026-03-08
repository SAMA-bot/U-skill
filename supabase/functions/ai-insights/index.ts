import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user via getClaims
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub as string;

    const userId = user.id;

    // Gather dashboard data for this user
    const [
      { data: activities },
      { data: perfMetrics },
      { data: enrollments },
      { data: feedback },
      { data: motivationScores },
      { data: profile },
    ] = await Promise.all([
      supabase.from("activities").select("title, activity_type, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("performance_metrics").select("month, year, teaching_score, research_score, service_score").eq("user_id", userId).order("year", { ascending: false }).limit(12),
      supabase.from("course_enrollments").select("status, enrolled_at, completed_at").eq("user_id", userId).limit(20),
      supabase.from("faculty_feedback").select("rating, category, created_at, comment").eq("faculty_id", userId).order("created_at", { ascending: false }).limit(15),
      supabase.from("motivation_scores").select("week_number, year, motivation_index, engagement_score").eq("user_id", userId).order("year", { ascending: false }).limit(10),
      supabase.from("profiles").select("full_name, department, designation").eq("user_id", userId).single(),
    ]);

    const dashboardSummary = {
      profile: profile || {},
      recentActivities: activities || [],
      performanceMetrics: perfMetrics || [],
      courseEnrollments: enrollments || [],
      feedbackReceived: feedback || [],
      motivationTrends: motivationScores || [],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a faculty performance analytics assistant. Analyze the provided dashboard data and generate exactly 4 short, actionable insights. Each insight should be a JSON object with:
- "icon": one of "training", "performance", "feedback", "motivation", "trend"
- "title": a short title (max 6 words)
- "description": a concise insight (max 25 words)  
- "type": one of "positive", "warning", "neutral"

Return ONLY a JSON array of 4 insight objects. No markdown, no explanation.
If data is sparse, provide encouraging or general advisory insights based on what's available.`,
          },
          {
            role: "user",
            content: `Analyze this faculty dashboard data and generate insights:\n${JSON.stringify(dashboardSummary)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response, handling potential markdown wrapping
    let insights;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      insights = [
        { icon: "trend", title: "Analysis Unavailable", description: "Could not generate insights at this time. Try again later.", type: "neutral" },
      ];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
