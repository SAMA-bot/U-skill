import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configurations
const RATE_LIMITS = {
  enroll: { maxRequests: 10, windowMinutes: 60 }, // 10 enrollments per hour
  start: { maxRequests: 20, windowMinutes: 60 }, // 20 starts per hour
  complete: { maxRequests: 10, windowMinutes: 60 }, // 10 completions per hour
  progress: { maxRequests: 100, windowMinutes: 60 }, // 100 progress updates per hour
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for rate limiting and data operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} making course action request`);

    // Parse request body
    const { action, courseId, progressPercentage } = await req.json();

    if (!action || !courseId) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Missing action or courseId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Action: ${action}, Course: ${courseId}, User: ${user.id}`);

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
        p_user_id: user.id,
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
      console.warn(`Rate limit exceeded for user ${user.id} on action ${action}`);
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
        result = await handleEnroll(supabaseAdmin, user.id, courseId);
        break;
      case "start":
        result = await handleStart(supabaseAdmin, user.id, courseId);
        break;
      case "complete":
        result = await handleComplete(supabaseAdmin, user.id, courseId);
        break;
      case "progress":
        result = await handleProgress(supabaseAdmin, user.id, courseId, progressPercentage);
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

    console.log(`Action ${action} completed successfully for user ${user.id}`);
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
  // Check if already enrolled
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
  // Check if enrolled
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id, status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  if (!existing) {
    // Enroll first
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

  // Update to in_progress
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
