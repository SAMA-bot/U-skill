import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user via getClaims
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentUserId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather institutional data
    const [profilesRes, metricsRes, enrollmentsRes, activitiesRes, feedbackRes, skillsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, department"),
      supabase.from("performance_metrics").select("user_id, month, year, teaching_score, research_score, service_score").order("year", { ascending: true }).order("month", { ascending: true }),
      supabase.from("course_enrollments").select("user_id, status, course_id").order("enrolled_at", { ascending: false }),
      supabase.from("activities").select("user_id, activity_type, status, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("faculty_feedback").select("faculty_id, rating, category, created_at").order("created_at", { ascending: false }).limit(300),
      supabase.from("capacity_skills").select("user_id, skill_name, current_level, target_level"),
    ]);

    const totalFaculty = profilesRes.data?.length || 0;
    const departments = [...new Set((profilesRes.data || []).map(p => p.department).filter(Boolean))];

    const deptPerf: Record<string, { total: number; count: number }> = {};
    for (const m of metricsRes.data || []) {
      const profile = profilesRes.data?.find(p => p.user_id === m.user_id);
      const dept = profile?.department || "Unknown";
      if (!deptPerf[dept]) deptPerf[dept] = { total: 0, count: 0 };
      const avg = ((m.teaching_score || 0) + (m.research_score || 0) + (m.service_score || 0)) / 3;
      deptPerf[dept].total += avg;
      deptPerf[dept].count += 1;
    }

    const deptSummary = Object.entries(deptPerf).map(([dept, v]) => ({
      department: dept,
      avgScore: v.count > 0 ? Math.round(v.total / v.count) : 0,
      dataPoints: v.count,
    }));

    const enrolled = (enrollmentsRes.data || []).length;
    const completed = (enrollmentsRes.data || []).filter(e => e.status === "completed").length;
    const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

    const skillGaps = (skillsRes.data || [])
      .filter(s => (s.target_level || 100) - (s.current_level || 0) > 30)
      .reduce((acc: Record<string, number>, s) => {
        acc[s.skill_name] = (acc[s.skill_name] || 0) + 1;
        return acc;
      }, {});

    const activityTypes: Record<string, number> = {};
    for (const a of activitiesRes.data || []) {
      if (a.status === "completed" && a.activity_type) {
        activityTypes[a.activity_type] = (activityTypes[a.activity_type] || 0) + 1;
      }
    }

    const feedbackData = feedbackRes.data || [];
    const avgRating = feedbackData.length > 0
      ? (feedbackData.reduce((s, f) => s + f.rating, 0) / feedbackData.length).toFixed(1)
      : "N/A";

    const dataContext = `
INSTITUTIONAL DATA SUMMARY:
- Total Faculty: ${totalFaculty}
- Departments: ${departments.join(", ") || "None"}
- Department Performance: ${JSON.stringify(deptSummary)}
- Training Completion Rate: ${completionRate}% (${completed}/${enrolled} enrollments)
- Skill Gaps (>30 points below target): ${JSON.stringify(skillGaps)}
- Activity Types Completed: ${JSON.stringify(activityTypes)}
- Average Feedback Rating: ${avgRating}/5
- Performance Metrics Data Points: ${(metricsRes.data || []).length}
`;

    const systemPrompt = `You are an educational analytics expert. Analyze the institutional data and provide predictive insights.

Return a JSON object using the tool provided with exactly these fields:
- performanceTrends: array of 3-5 predictions about faculty performance trends (each with "title", "description", "direction" as "up"/"down"/"stable", "confidence" as "high"/"medium"/"low", "department" as affected department or "All")
- trainingNeeds: array of 3-5 predicted training needs (each with "skill", "urgency" as "high"/"medium"/"low", "affectedCount" as number, "recommendation" as actionable suggestion)
- riskFactors: array of 2-3 risk areas (each with "area", "risk" description, "mitigation" suggestion)
- overallOutlook: a single sentence summary of the institutional trajectory

Base predictions on actual data patterns. Be specific and actionable.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataContext },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_predictions",
              description: "Return structured predictive analytics",
              parameters: {
                type: "object",
                properties: {
                  performanceTrends: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        direction: { type: "string", enum: ["up", "down", "stable"] },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        department: { type: "string" },
                      },
                      required: ["title", "description", "direction", "confidence", "department"],
                    },
                  },
                  trainingNeeds: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                        affectedCount: { type: "number" },
                        recommendation: { type: "string" },
                      },
                      required: ["skill", "urgency", "affectedCount", "recommendation"],
                    },
                  },
                  riskFactors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string" },
                        risk: { type: "string" },
                        mitigation: { type: "string" },
                      },
                      required: ["area", "risk", "mitigation"],
                    },
                  },
                  overallOutlook: { type: "string" },
                },
                required: ["performanceTrends", "trainingNeeds", "riskFactors", "overallOutlook"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_predictions" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate predictions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const predictions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Predictive analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
