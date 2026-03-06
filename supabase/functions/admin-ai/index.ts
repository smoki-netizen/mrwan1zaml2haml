import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const aiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !aiKey) {
      throw new Error("Missing critical environment variables");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roles?.role !== "admin") throw new Error("Admin access required");

    const { prompt } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch context
    const [anime, seasons, servers] = await Promise.all([
      adminClient.from("anime").select("*").order("created_at", { ascending: false }).limit(50),
      adminClient.from("seasons").select("*").order("season_number").limit(100),
      adminClient.from("servers").select("*").limit(50),
    ]);

    const snapshot = { anime: anime.data, seasons: seasons.data, servers: servers.data };

    // Call AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت مدير قاعدة بيانات أنمي بصلاحيات كاملة. استجب دائماً بصيغة JSON فقط:
{"reply": "رسالة بالعربي", "actions": []}

العمليات المتاحة:
- list_anime: عرض الأنميات
- insert_anime: إضافة أنمي {title, description?, poster_url?}
- update_anime: تعديل أنمي {id, title?, description?, poster_url?}
- delete_anime: حذف أنمي {id}
- insert_season: إضافة موسم {anime_id, season_number, label, episodes_count}
- update_season: تعديل موسم {id, season_number?, label?, episodes_count?}
- delete_season: حذف موسم {id}
- insert_server: إضافة سيرفر {anime_id, name, base_url}
- update_server: تعديل سيرفر {id, name?, base_url?}
- delete_server: حذف سيرفر {id}

قواعد مهمة:
- استخدم المعرفات (IDs) من البيانات المقدمة فقط. لا تخترع IDs.
- يمكنك تنفيذ عمليات متعددة في نفس الرد.
- رابط الفيديو يكون بصيغة: base_url/c{season_number}/EP{episode}.mp4
- لديك صلاحية كاملة لتغيير أي شيء في قاعدة البيانات.`
          },
          { role: "user", content: `الطلب: ${prompt}\nالبيانات: ${JSON.stringify(snapshot)}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await aiResp.json();
    const content = aiData.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Execute actions
    const results = [];
    for (const action of (parsed.actions || []).slice(0, 10)) {
      let res;
      switch (action.type) {
        case "insert_anime":
          res = await adminClient.from("anime").insert({
            title: action.title,
            description: action.description || "",
            poster_url: action.poster_url || "",
          }).select();
          break;
        case "update_anime":
          const animeUpdate: Record<string, unknown> = {};
          if (action.title !== undefined) animeUpdate.title = action.title;
          if (action.description !== undefined) animeUpdate.description = action.description;
          if (action.poster_url !== undefined) animeUpdate.poster_url = action.poster_url;
          res = await adminClient.from("anime").update(animeUpdate).eq("id", action.id).select();
          break;
        case "delete_anime":
          res = await adminClient.from("anime").delete().eq("id", action.id);
          break;
        case "insert_season":
          res = await adminClient.from("seasons").insert({
            anime_id: action.anime_id,
            season_number: action.season_number,
            label: action.label,
            episodes_count: action.episodes_count || 12,
          }).select();
          break;
        case "update_season": {
          const seasonUpdate: Record<string, unknown> = {};
          if (action.season_number !== undefined) seasonUpdate.season_number = action.season_number;
          if (action.label !== undefined) seasonUpdate.label = action.label;
          if (action.episodes_count !== undefined) seasonUpdate.episodes_count = action.episodes_count;
          res = await adminClient.from("seasons").update(seasonUpdate).eq("id", action.id).select();
          break;
        }
        case "delete_season":
          res = await adminClient.from("seasons").delete().eq("id", action.id);
          break;
        case "insert_server":
          res = await adminClient.from("servers").insert({
            anime_id: action.anime_id,
            name: action.name,
            base_url: action.base_url,
          }).select();
          break;
        case "update_server": {
          const serverUpdate: Record<string, unknown> = {};
          if (action.name !== undefined) serverUpdate.name = action.name;
          if (action.base_url !== undefined) serverUpdate.base_url = action.base_url;
          res = await adminClient.from("servers").update(serverUpdate).eq("id", action.id).select();
          break;
        }
        case "delete_server":
          res = await adminClient.from("servers").delete().eq("id", action.id);
          break;
        default:
          results.push({ action: action.type, success: false, error: "Unknown action" });
          continue;
      }
      results.push({ action: action.type, success: !res?.error, data: res?.data, error: res?.error });
    }

    return new Response(JSON.stringify({ reply: parsed.reply, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
