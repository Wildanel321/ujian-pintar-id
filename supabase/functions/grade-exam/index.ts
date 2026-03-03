import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: { user } } = await callerClient.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { subject_id, answers, profile_id, duration_minutes, session_id } = await req.json();

    if (!subject_id || !profile_id) throw new Error("Missing required fields");

    // Verify profile belongs to caller
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_id')
      .eq('id', profile_id)
      .single();

    if (!profile || profile.auth_id !== user.id) {
      throw new Error("Forbidden");
    }

    // Get correct answers from DB (server-side only)
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('id, answer')
      .eq('subject_id', subject_id);

    if (!questions || questions.length === 0) {
      throw new Error("No questions found");
    }

    const answerMap = new Map(questions.map((q: any) => [q.id, q.answer]));

    let correct = 0;
    let wrong = 0;
    for (const [questionId, userAnswer] of Object.entries(answers || {})) {
      const correctAnswer = answerMap.get(questionId);
      if (userAnswer === correctAnswer) correct++;
      else if (userAnswer) wrong++;
    }

    const total = questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Insert result server-side (trusted)
    const { error: insertError } = await supabaseAdmin.from('results').insert({
      user_id: profile_id,
      subject_id,
      score,
      correct_count: correct,
      wrong_count: wrong,
      duration_minutes: duration_minutes ?? null,
    });

    if (insertError) throw new Error("Failed to save result: " + insertError.message);

    // Complete exam session if provided
    if (session_id) {
      await supabaseAdmin
        .from('exam_sessions')
        .update({ is_completed: true, ended_at: new Date().toISOString() })
        .eq('id', session_id);
    }

    return new Response(JSON.stringify({ score, correct, wrong, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
