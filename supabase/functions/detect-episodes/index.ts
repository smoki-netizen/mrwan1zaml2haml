import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function checkUrl(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    let res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    // Some hosts don't support HEAD properly
    if (res.status === 405 || res.status === 501) {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 8000);
      res = await fetch(url, { method: "GET", signal: ctrl2.signal, headers: { Range: "bytes=0-1" } });
      clearTimeout(t2);
    }
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles as { role: string }[] | null)?.some((r) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { season_id, server_id, max = 300 } = await req.json();
    if (!season_id) throw new Error("season_id required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: season } = await admin.from("seasons").select("*").eq("id", season_id).single();
    if (!season) throw new Error("Season not found");

    // Pick server: provided one, or first server for the anime
    let server;
    if (server_id) {
      const r = await admin.from("servers").select("*").eq("id", server_id).single();
      server = r.data;
    } else {
      const r = await admin.from("servers").select("*").eq("anime_id", season.anime_id).order("created_at").limit(1);
      server = r.data?.[0];
    }
    if (!server) throw new Error("No server configured for this anime");

    const baseUrl = String(server.base_url).replace(/\/+$/, "");
    const buildUrl = (ep: number) => `${baseUrl}/c${season.season_number}/EP${ep}.mp4`;

    // Probe in batches of 10, stop when a full batch fails
    let lastOk = 0;
    const tried: number[] = [];
    const batchSize = 10;
    for (let start = 1; start <= max; start += batchSize) {
      const batch = Array.from({ length: batchSize }, (_, i) => start + i).filter((n) => n <= max);
      const results = await Promise.all(batch.map((ep) => checkUrl(buildUrl(ep)).then((ok) => ({ ep, ok }))));
      let batchHadHit = false;
      for (const r of results) {
        tried.push(r.ep);
        if (r.ok) { lastOk = Math.max(lastOk, r.ep); batchHadHit = true; }
      }
      // Stop when an entire batch fails AFTER we already found something
      if (!batchHadHit && lastOk > 0) break;
      // If first batch fully fails, stop too
      if (!batchHadHit && start === 1) break;
    }

    if (lastOk > 0) {
      await admin.from("seasons").update({ episodes_count: lastOk }).eq("id", season_id);
    }

    return new Response(JSON.stringify({
      season_id, server_id: server.id, server_name: server.name,
      detected: lastOk, tried_up_to: tried[tried.length - 1] || 0,
      sample_url: buildUrl(1),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
