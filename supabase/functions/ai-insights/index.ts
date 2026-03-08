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
    // Validate environment variables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing LOVABLE_API_KEY secret");
      throw new Error("AI service is not configured. Please contact support.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables:", {
        url: !!supabaseUrl,
        serviceKey: !!supabaseServiceKey,
        anonKey: !!supabaseAnonKey,
      });
      throw new Error("Backend configuration error");
    }

    // Authenticate user via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError?.message || "No claims returned");
      return new Response(JSON.stringify({ error: "Session expired. Please log in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log("Generating AI insights for user:", userId);

    // Use service role client for data fetching
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gather dashboard data for this user
    const [
      { data: activities, error: actErr },
      { data: perfMetrics, error: perfErr },
      { data: enrollments, error: enrErr },
      { data: feedback, error: fbErr },
      { data: motivationScores, error: motErr },
      { data: profile, error: profErr },
    ] = await Promise.all([
      supabase.from("activities").select("title, activity_type, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("performance_metrics").select("month, year, teaching_score, research_score, service_score").eq("user_id", userId).order("year", { ascending: false }).limit(12),
      supabase.from("course_enrollments").select("status, enrolled_at, completed_at").eq("user_id", userId).limit(20),
      supabase.from("faculty_feedback").select("rating, category, created_at, comment").eq("faculty_id", userId).order("created_at", { ascending: false }).limit(15),
      supabase.from("motivation_scores").select("week_number, year, motivation_index, engagement_score").eq("user_id", userId).order("year", { ascending: false }).limit(10),
      supabase.from("profiles").select("full_name, department, designation").eq("user_id", userId).single(),
    ]);

    // Log any data fetch errors but continue
    const dataErrors = [actErr, perfErr, enrErr, fbErr, motErr, profErr].filter(Boolean);
    if (dataErrors.length > 0) {
      console.warn("Some data queries had errors:", dataErrors.map(e => e?.message));
    }

    const dashboardSummary = {
      profile: profile || {},
      recentActivities: activities || [],
      performanceMetrics: perfMetrics || [],
      courseEnrollments: enrollments || [],
      feedbackReceived: feedback || [],
      motivationTrends: motivationScores || [],
    };

    console.log("Calling AI gateway...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota reached. Try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return fallback insights instead of error
      return new Response(JSON.stringify({
        insights: [
          { icon: "trend", title: "Keep Going!", description: "Continue logging activities to build a detailed performance profile.", type: "neutral" },
          { icon: "training", title: "Explore Courses", description: "Enroll in available training programs to boost your skills.", type: "neutral" },
          { icon: "performance", title: "Track Progress", description: "Regularly update your metrics to see growth trends.", type: "neutral" },
          { icon: "motivation", title: "Stay Consistent", description: "Daily engagement helps build momentum and improve scores.", type: "positive" },
        ],
        fallback: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        { icon: "trend", title: "Analysis Unavailable", description: "Could not parse insights. Try refreshing.", type: "neutral" },
      ];
    }

    console.log("Successfully generated", insights.length, "insights");

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
