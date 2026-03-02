import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!).auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { name, username, password, kelas } = payload;
      const email = `${username}@student.cbt`;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        auth_id: authData.user.id,
        name,
        username,
        role: "peserta",
        kelas: kelas || null,
      });
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { id, name, username, password, kelas } = payload;

      await supabaseAdmin.from("profiles").update({
        name, username, kelas: kelas || null,
      }).eq("id", id);

      // If password provided, update auth user too
      if (password) {
        const { data: profile } = await supabaseAdmin.from("profiles").select("auth_id").eq("id", id).single();
        if (profile?.auth_id) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_id, { password });
          if (error) throw error;
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = payload;
      const { data: profile } = await supabaseAdmin.from("profiles").select("auth_id").eq("id", id).single();
      
      if (profile?.auth_id) {
        await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
      }
      await supabaseAdmin.from("profiles").delete().eq("id", id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
