import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = {
  type: "list_anime" | "insert_anime" | "update_anime" | "delete_anime" | "insert_season" | "delete_season" | "insert_server" | "delete_server";
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
  // معالجة طلب Preflight
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

    // التحقق من الهوية والأدمن
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roles?.role !== "admin") throw new Error("Admin access required");

    // استلام الطلب
    const { prompt } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // جلب البيانات لإعطاء سياق لـ Gemini
    const [anime, seasons, servers] = await Promise.all([
      adminClient.from("anime").select("id,title").order("created_at", { ascending: false }).limit(20),
      adminClient.from("seasons").select("id,anime_id,label").limit(20),
      adminClient.from("servers").select("id,name").limit(20),
    ]);

    const snapshot = { anime: anime.data, seasons: seasons.data, servers: servers.data };

    // استدعاء Gemini
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash", // استخدام نسخة مستقرة وسريعة
        messages: [
          {
            role: "system",
            content: `أنت مدير قاعدة بيانات أنمي. استجب دائماً بصيغة JSON فقط: {"reply": "رسالة بالعربي", "actions": []}.
            العمليات المتاحة: [list_anime, insert_anime, update_anime, delete_anime, insert_season, delete_season, insert_server, delete_server].
            استخدم المعرفات (IDs) من البيانات المقدمة فقط. لا تخترع IDs.`
          },
          { role: "user", content: `الطلب: ${prompt} \n البيانات: ${JSON.stringify(snapshot)}` }
        ],
        response_format: { type: "json_object" } // إجبار Gemini على الرد بـ JSON
      }),
    });

    const aiData = await aiResp.json();
    const content = aiData.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // تنفيذ العمليات (Actions Loop)
    const results = [];
    for (const action of (parsed.actions || []).slice(0, 5)) {
        let res;
        if (action.type === "insert_anime") {
            res = await adminClient.from("anime").insert({ title: action.title, description: action.description, poster_url: action.poster_url }).select();
        } else if (action.type === "delete_anime") {
            res = await adminClient.from("anime").delete().eq("id", action.id);
        }
        // ... يمكنك إضافة باقي الحالات هنا بنفس النمط
        results.push({ action: action.type, success: !res?.error, error: res?.error });
    }

    return new Response(JSON.stringify({ reply: parsed.reply, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
