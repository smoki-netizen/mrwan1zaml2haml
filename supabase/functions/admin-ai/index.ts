import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = {
  type:
    | "list_anime"
    | "insert_anime"
    | "update_anime"
    | "delete_anime"
    | "insert_season"
    | "delete_season"
    | "insert_server"
    | "delete_server";
  id?: string;
  anime_id?: string;
  title?: string;
  description?: string;
  poster_url?: string;
  label?: string;
  season_number?: number;
  episodes_count?: number;
  name?: string;
  base_url?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const aiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !aiKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: roleErr } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleErr || !(roles ?? []).some((r) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [animeRes, seasonRes, serverRes] = await Promise.all([
      adminClient.from("anime").select("id,title,description,poster_url,created_at").order("created_at", { ascending: false }).limit(30),
      adminClient.from("seasons").select("id,anime_id,label,season_number,episodes_count").order("created_at", { ascending: false }).limit(50),
      adminClient.from("servers").select("id,anime_id,name,base_url").order("created_at", { ascending: false }).limit(50),
    ]);

    const snapshot = {
      anime: animeRes.data ?? [],
      seasons: seasonRes.data ?? [],
      servers: serverRes.data ?? [],
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد إداري لموقع أنمي. مهمتك تنفيذ طلبات الأدمن على قاعدة البيانات (إضافة/تعديل/حذف/عرض). أجب بصيغة JSON فقط بدون أي نص إضافي. الصيغة المطلوبة: {\"reply\":\"نص عربي\",\"actions\":[...]} . استخدم actions فقط من الأنواع المسموحة: list_anime, insert_anime, update_anime, delete_anime, insert_season, delete_season, insert_server, delete_server. لا تنشئ أكثر من 5 عمليات. عند التعديل استخدم id موجود من البيانات. إن كان الطلب استفسار فقط، اجعل actions فارغة.",
          },
          {
            role: "user",
            content: `طلب الأدمن: ${prompt}\n\nالبيانات الحالية (snapshot): ${JSON.stringify(snapshot)}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI request failed: ${errText}`);
    }

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: { reply?: string; actions?: Action[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, actions: [] };
    }

    const actions = (parsed.actions ?? []).slice(0, 5);
    const results: Array<Record<string, unknown>> = [];

    for (const action of actions) {
      switch (action.type) {
        case "list_anime": {
          const { data } = await adminClient.from("anime").select("id,title,description,poster_url").order("created_at", { ascending: false }).limit(20);
          results.push({ type: action.type, ok: true, data });
          break;
        }
        case "insert_anime": {
          const { data, error } = await adminClient
            .from("anime")
            .insert({
              title: action.title ?? "أنمي جديد",
              description: action.description ?? "",
              poster_url: action.poster_url ?? "",
            })
            .select("id,title")
            .single();
          results.push({ type: action.type, ok: !error, error: error?.message, data });
          break;
        }
        case "update_anime": {
          if (!action.id) {
            results.push({ type: action.type, ok: false, error: "Missing anime id" });
            break;
          }
          const payload: Record<string, unknown> = {};
          if (typeof action.title === "string") payload.title = action.title;
          if (typeof action.description === "string") payload.description = action.description;
          if (typeof action.poster_url === "string") payload.poster_url = action.poster_url;
          const { data, error } = await adminClient
            .from("anime")
            .update(payload)
            .eq("id", action.id)
            .select("id,title")
            .single();
          results.push({ type: action.type, ok: !error, error: error?.message, data });
          break;
        }
        case "delete_anime": {
          if (!action.id) {
            results.push({ type: action.type, ok: false, error: "Missing anime id" });
            break;
          }
          const { error } = await adminClient.from("anime").delete().eq("id", action.id);
          results.push({ type: action.type, ok: !error, error: error?.message, id: action.id });
          break;
        }
        case "insert_season": {
          if (!action.anime_id) {
            results.push({ type: action.type, ok: false, error: "Missing anime_id" });
            break;
          }
          const { data, error } = await adminClient
            .from("seasons")
            .insert({
              anime_id: action.anime_id,
              label: action.label ?? `الموسم ${action.season_number ?? 1}`,
              season_number: action.season_number ?? 1,
              episodes_count: action.episodes_count ?? 12,
            })
            .select("id,label,anime_id")
            .single();
          results.push({ type: action.type, ok: !error, error: error?.message, data });
          break;
        }
        case "delete_season": {
          if (!action.id) {
            results.push({ type: action.type, ok: false, error: "Missing season id" });
            break;
          }
          const { error } = await adminClient.from("seasons").delete().eq("id", action.id);
          results.push({ type: action.type, ok: !error, error: error?.message, id: action.id });
          break;
        }
        case "insert_server": {
          if (!action.anime_id) {
            results.push({ type: action.type, ok: false, error: "Missing anime_id" });
            break;
          }
          const { data, error } = await adminClient
            .from("servers")
            .insert({
              anime_id: action.anime_id,
              name: action.name ?? "Server",
              base_url: action.base_url ?? "",
            })
            .select("id,name,anime_id")
            .single();
          results.push({ type: action.type, ok: !error, error: error?.message, data });
          break;
        }
        case "delete_server": {
          if (!action.id) {
            results.push({ type: action.type, ok: false, error: "Missing server id" });
            break;
          }
          const { error } = await adminClient.from("servers").delete().eq("id", action.id);
          results.push({ type: action.type, ok: !error, error: error?.message, id: action.id });
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({
        reply: parsed.reply ?? "تم تنفيذ الطلب",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("admin-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
