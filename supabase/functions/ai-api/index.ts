import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Auth: accept either admin session OR x-api-key header
    const apiKeyHeader = req.headers.get("x-api-key") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    let authorized = false;

    // Method 1: API key from settings table
    if (apiKeyHeader) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: setting } = await adminClient
        .from("settings")
        .select("value")
        .eq("key", "ai_api_key")
        .maybeSingle();
      if (setting?.value && setting.value === apiKeyHeader) {
        authorized = true;
      }
    }

    // Method 2: Admin session auth
    if (!authorized && authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roles } = await userClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (roles?.role === "admin") authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized. Provide x-api-key header or admin Authorization." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'prompt' field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch full context
    const [anime, seasons, servers, settingsRes] = await Promise.all([
      adminClient.from("anime").select("*").order("created_at", { ascending: false }).limit(100),
      adminClient.from("seasons").select("*").order("season_number").limit(500),
      adminClient.from("servers").select("*").limit(200),
      adminClient.from("settings").select("*").limit(100),
    ]);

    const snapshot = {
      anime: anime.data,
      seasons: seasons.data,
      servers: servers.data,
      settings: settingsRes.data,
    };

    // Call AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت وكيل ذكاء اصطناعي لإدارة موقع أنمي بصلاحيات كاملة. استجب دائماً بصيغة JSON فقط:
{"reply": "رسالة بالعربي", "actions": []}

العمليات المتاحة:

=== إدارة الأنمي ===
- insert_anime: إضافة أنمي {title, description?, poster_url?}
- update_anime: تعديل أنمي {id, title?, description?, poster_url?}
- delete_anime: حذف أنمي {id}

=== إدارة المواسم ===
- insert_season: إضافة موسم {anime_id, season_number, label, episodes_count}
- update_season: تعديل موسم {id, season_number?, label?, episodes_count?}
- delete_season: حذف موسم {id}

=== إدارة السيرفرات ===
- insert_server: إضافة سيرفر {anime_id, name, base_url}
- update_server: تعديل سيرفر {id, name?, base_url?}
- delete_server: حذف سيرفر {id}

=== إعدادات الموقع ===
- upsert_setting: تغيير إعداد {key, value}
  المفاتيح المتاحة:
  - site_title: عنوان الموقع
  - site_description: وصف الموقع
  - primary_color: اللون الأساسي بصيغة HSL بدون أقواس (مثل "195 100% 50%")
  - accent_color: لون التمييز بصيغة HSL
  - logo_url: رابط شعار الموقع
  - hero_text: النص الرئيسي في الصفحة الأولى
  - footer_text: نص التذييل

=== عمليات جماعية ===
- bulk_insert_seasons: إضافة مواسم متعددة {anime_id, seasons: [{season_number, label, episodes_count}]}
- bulk_delete: حذف متعدد {table: "anime"|"seasons"|"servers", ids: []}

قواعد مهمة:
- استخدم المعرفات (IDs) من البيانات المقدمة فقط. لا تخترع IDs.
- يمكنك تنفيذ عمليات متعددة في نفس الرد (حتى 30 عملية).
- رابط الفيديو يكون بصيغة: base_url/c{season_number}/EP{episode}.mp4
- لديك صلاحية كاملة لتغيير أي شيء.
- عند تغيير الألوان، استخدم صيغة HSL فقط.
- إذا طلب المستخدم شيئاً غير واضح، اسأل في الـ reply واترك actions فارغة.
- إذا طلب معلومات فقط (مثل "كم أنمي عندي؟")، أجب من البيانات المتاحة بدون actions.`
          },
          { role: "user", content: `الطلب: ${prompt}\n\nالبيانات الحالية:\n${JSON.stringify(snapshot)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Execute actions
    const results = [];
    for (const action of (parsed.actions || []).slice(0, 30)) {
      let res;
      try {
        switch (action.type) {
          case "insert_anime":
            res = await adminClient.from("anime").insert({
              title: action.title,
              description: action.description || "",
              poster_url: action.poster_url || "",
            }).select();
            break;

          case "update_anime": {
            const u: Record<string, unknown> = {};
            if (action.title !== undefined) u.title = action.title;
            if (action.description !== undefined) u.description = action.description;
            if (action.poster_url !== undefined) u.poster_url = action.poster_url;
            res = await adminClient.from("anime").update(u).eq("id", action.id).select();
            break;
          }

          case "delete_anime":
            // Delete related data first
            await adminClient.from("seasons").delete().eq("anime_id", action.id);
            await adminClient.from("servers").delete().eq("anime_id", action.id);
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
            const u: Record<string, unknown> = {};
            if (action.season_number !== undefined) u.season_number = action.season_number;
            if (action.label !== undefined) u.label = action.label;
            if (action.episodes_count !== undefined) u.episodes_count = action.episodes_count;
            res = await adminClient.from("seasons").update(u).eq("id", action.id).select();
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
            const u: Record<string, unknown> = {};
            if (action.name !== undefined) u.name = action.name;
            if (action.base_url !== undefined) u.base_url = action.base_url;
            res = await adminClient.from("servers").update(u).eq("id", action.id).select();
            break;
          }

          case "delete_server":
            res = await adminClient.from("servers").delete().eq("id", action.id);
            break;

          case "upsert_setting":
            res = await adminClient.from("settings").upsert(
              { key: action.key, value: action.value, updated_at: new Date().toISOString() },
              { onConflict: "key" }
            ).select();
            break;

          case "bulk_insert_seasons": {
            const rows = (action.seasons || []).map((s: any) => ({
              anime_id: action.anime_id,
              season_number: s.season_number,
              label: s.label,
              episodes_count: s.episodes_count || 12,
            }));
            res = await adminClient.from("seasons").insert(rows).select();
            break;
          }

          case "bulk_delete": {
            const table = action.table as "anime" | "seasons" | "servers";
            if (!["anime", "seasons", "servers"].includes(table)) {
              results.push({ action: action.type, success: false, error: "Invalid table" });
              continue;
            }
            res = await adminClient.from(table).delete().in("id", action.ids || []);
            break;
          }

          default:
            results.push({ action: action.type, success: false, error: "Unknown action" });
            continue;
        }
        results.push({ action: action.type, success: !res?.error, data: res?.data, error: res?.error?.message });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Action failed";
        results.push({ action: action.type, success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ reply: parsed.reply, actions_count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-api error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
