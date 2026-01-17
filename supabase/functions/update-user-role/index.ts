import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user token to verify they're authenticated
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client to check if user is admin and update roles
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the requesting user is an admin
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || requesterRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can change user roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return new Response(
        JSON.stringify({ error: "userId and newRole are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "hod", "faculty"];
    if (!validRoles.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, hod, or faculty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's role using service role (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating role:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Role updated to ${newRole}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
