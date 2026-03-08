import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Rate limit configurations
const RATE_LIMITS = {
  enroll: { maxRequests: 10, windowMinutes: 60 },
  start: { maxRequests: 20, windowMinutes: 60 },
  complete: { maxRequests: 10, windowMinutes: 60 },
  progress: { maxRequests: 100, windowMinutes: 60 },
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user via getClaims
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`User ${userId} making course action request`);

    // Parse and validate request body
    const body = await req.json();
    const { action, courseId, progressPercentage } = body;

    if (!action || typeof action !== "string" || !courseId || typeof courseId !== "string") {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Missing or invalid action or courseId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(courseId)) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid courseId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (progressPercentage !== undefined && (typeof progressPercentage !== "number" || progressPercentage < 0 || progressPercentage > 100)) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "progressPercentage must be a number between 0 and 100" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Action: ${action}, Course: ${courseId}, User: ${userId}`);

    // Check rate limit
    const rateConfig = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
    if (!rateConfig) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: rateLimitPassed, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        p_user_id: userId,
        p_action_type: `course_${action}`,
        p_max_requests: rateConfig.maxRequests,
        p_window_minutes: rateConfig.windowMinutes,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      return new Response(
        JSON.stringify({ error: "Internal Error", message: "Rate limit check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rateLimitPassed) {
      console.warn(`Rate limit exceeded for user ${userId} on action ${action}`);
      return new Response(
        JSON.stringify({
          error: "Rate Limit Exceeded",
          message: `Too many ${action} requests. Please try again later.`,
          retryAfter: rateConfig.windowMinutes * 60,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateConfig.windowMinutes * 60),
          },
        }
      );
    }

    // Process the action
    let result;
    switch (action) {
      case "enroll":
        result = await handleEnroll(supabaseAdmin, userId, courseId);
        break;
      case "start":
        result = await handleStart(supabaseAdmin, userId, courseId);
        break;
      case "complete":
        result = await handleComplete(supabaseAdmin, userId, courseId);
        break;
      case "progress":
        result = await handleProgress(supabaseAdmin, userId, courseId, progressPercentage);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Bad Request", message: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (result.error) {
      console.error(`Action ${action} failed:`, result.error);
      const errorCode = 'code' in result.error ? result.error.code : "Error";
      return new Response(
        JSON.stringify({ error: errorCode, message: result.error.message }),
        { status: result.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Action ${action} completed successfully for user ${userId}`);
    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleEnroll(supabase: any, userId: string, courseId: string) {
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (existing) {
    return { error: { code: "ALREADY_ENROLLED", message: "You are already enrolled in this course" }, status: 409 };
  }

  const { data, error } = await supabase
    .from("course_enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      status: "enrolled",
      progress_percentage: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: { message: error.message }, status: 400 };
  }

  return { data };
}

async function handleStart(supabase: any, userId: string, courseId: string) {
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id, status, progress_percentage")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (!existing) {
    const { data: enrolled, error: enrollError } = await supabase
      .from("course_enrollments")
      .insert({
        user_id: userId,
        course_id: courseId,
        status: "in_progress",
        progress_percentage: 10,
      })
      .select()
      .single();

    if (enrollError) {
      return { error: { message: enrollError.message }, status: 400 };
    }
    return { data: enrolled };
  }

  const { data, error } = await supabase
    .from("course_enrollments")
    .update({
      status: "in_progress",
      progress_percentage: Math.max(existing.progress_percentage || 0, 10),
    })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .select()
    .single();

  if (error) {
    return { error: { message: error.message }, status: 400 };
  }

  return { data };
}

async function handleComplete(supabase: any, userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("course_enrollments")
    .update({
      status: "completed",
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .select()
    .single();

  if (error) {
    return { error: { message: error.message }, status: 400 };
  }

  if (!data) {
    return { error: { code: "NOT_ENROLLED", message: "You are not enrolled in this course" }, status: 404 };
  }

  return { data };
}

async function handleProgress(supabase: any, userId: string, courseId: string, percentage: number) {
  const safePercentage = Math.min(100, Math.max(0, percentage || 0));
  const isComplete = safePercentage >= 100;

  const { data, error } = await supabase
    .from("course_enrollments")
    .update({
      progress_percentage: safePercentage,
      status: isComplete ? "completed" : "in_progress",
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .select()
    .single();

  if (error) {
    return { error: { message: error.message }, status: 400 };
  }

  return { data };
}
