import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Plus, Trash2, Edit2, LogOut, Server, Layers, Key, Save, Sparkles, Code, Check, X } from "lucide-react";
import { AdminAiChat } from "@/components/AdminAiChat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Anime, Season, Server as ServerType } from "@/types/anime";

const Admin = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles as any[])?.some((r) => r.role === "admin");
      if (!isAdmin) { navigate("/admin/login"); return; }
      fetchAnime();
    };
    checkAuth();
  }, []);

  const fetchAnime = async () => {
    const { data } = await supabase.from("anime").select("*").order("created_at", { ascending: false });
    setAnimeList((data as Anime[]) || []);
    setLoading(false);
  };

  const fetchDetails = async (anime: Anime) => {
    setSelectedAnime(anime);
    const [seasonsRes, serversRes] = await Promise.all([
      supabase.from("seasons").select("*").eq("anime_id", anime.id).order("season_number"),
      supabase.from("servers").select("*").eq("anime_id", anime.id).order("created_at"),
    ]);
    setSeasons((seasonsRes.data as Season[]) || []);
    setServers((serversRes.data as ServerType[]) || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <header className="glass-strong sticky top-0 z-50 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-foreground neon-text flex items-center gap-2">
            <Film size={20} className="text-primary" />
            لوحة التحكم
          </h1>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive">
            <LogOut size={18} /> خروج
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 md:px-8">
        {/* Add Anime */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">الأنميات</h2>
          <AddAnimeDialog onAdded={fetchAnime} />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="glass rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {animeList.map((anime) => (
              <div
                key={anime.id}
                className={`glass rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer hover:neon-border ${
                  selectedAnime?.id === anime.id ? "neon-border bg-primary/5" : ""
                }`}
                onClick={() => fetchDetails(anime)}
              >
                <div className="flex items-center gap-3">
                  {anime.poster_url ? (
                    <img src={anime.poster_url} alt="" className="h-12 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded-lg bg-secondary/30 flex items-center justify-center">
                      <Film size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-bold text-foreground">{anime.title}</span>
                </div>
                <DeleteButton table="anime" id={anime.id} onDeleted={() => { fetchAnime(); if (selectedAnime?.id === anime.id) setSelectedAnime(null); }} />
              </div>
            ))}
          </div>
        )}

        {/* Details panel */}
        {selectedAnime && (
          <div className="mt-8 glass-strong rounded-2xl neon-border p-6 space-y-8">
            <h3 className="text-lg font-bold text-foreground neon-text">{selectedAnime.title} — التفاصيل</h3>

            {/* Seasons */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <Layers size={16} className="text-primary" /> المواسم
                </h4>
                <AddSeasonDialog animeId={selectedAnime.id} onAdded={() => fetchDetails(selectedAnime)} />
              </div>
              {seasons.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد مواسم</p>
              ) : (
                <div className="space-y-2">
                  {seasons.map((s) => (
                    <div key={s.id} className="glass rounded-xl p-3 flex items-center justify-between">
                      <span className="text-foreground text-sm">
                        {s.label} — {s.episodes_count} حلقة
                      </span>
                      <DeleteButton table="seasons" id={s.id} onDeleted={() => fetchDetails(selectedAnime)} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Servers */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <Server size={16} className="text-primary" /> السيرفرات
                </h4>
                <AddServerDialog animeId={selectedAnime.id} onAdded={() => fetchDetails(selectedAnime)} />
              </div>
              {servers.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد سيرفرات</p>
              ) : (
                <div className="space-y-2">
                  {servers.map((s) => (
                    <div key={s.id} className="glass rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-foreground text-sm font-bold">{s.name}</span>
                        <span className="text-muted-foreground text-xs mr-2 block" dir="ltr">{s.base_url}</span>
                      </div>
                      <DeleteButton table="servers" id={s.id} onDeleted={() => fetchDetails(selectedAnime)} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* JSON Editor */}
        {selectedAnime && (
          <JsonEditorSection
            anime={selectedAnime}
            seasons={seasons}
            servers={servers}
            onSaved={() => { fetchAnime(); fetchDetails(selectedAnime); }}
          />
        )}

        {/* API Settings */}
        <ApiSettingsSection />

        {/* AI Admin Chat */}
        <AdminAiChat onChanged={() => { fetchAnime(); if (selectedAnime) fetchDetails(selectedAnime); }} />
      </main>
    </div>
  );
};

// --- Sub-components ---

function AddAnimeDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast({ title: "تنبيه", description: "أدخل اسم الأنمي أولاً", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { title: title.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.description) setDescription(data.description);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل توليد الوصف", variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("anime").insert({ title, description, poster_url: posterUrl } as any);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { onAdded(); setOpen(false); setTitle(""); setDescription(""); setPosterUrl(""); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus size={16} /> إضافة أنمي</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong neon-border">
        <DialogHeader><DialogTitle className="text-foreground">إضافة أنمي جديد</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="اسم الأنمي" value={title} onChange={(e) => setTitle(e.target.value)} required className="glass border-border/50" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">الوصف</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateDescription}
                disabled={generating || !title.trim()}
                className="gap-1.5 text-xs h-7"
              >
                <Sparkles size={14} className={generating ? "animate-spin" : ""} />
                {generating ? "جاري التوليد..." : "توليد بالذكاء الاصطناعي"}
              </Button>
            </div>
            <Textarea placeholder="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} className="glass border-border/50" />
          </div>
          <Input placeholder="رابط البوستر" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} className="glass border-border/50" dir="ltr" />
          <Button type="submit" disabled={loading} className="w-full">{loading ? "جاري الإضافة..." : "إضافة"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddSeasonDialog({ animeId, onAdded }: { animeId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodesCount, setEpisodesCount] = useState(12);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("seasons").insert({
      anime_id: animeId, season_number: seasonNumber, label, episodes_count: episodesCount,
    } as any);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { onAdded(); setOpen(false); setLabel(""); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Plus size={14} /> إضافة موسم</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong neon-border">
        <DialogHeader><DialogTitle className="text-foreground">إضافة موسم</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="اسم الموسم (مثلاً: الجزء 1)" value={label} onChange={(e) => setLabel(e.target.value)} required className="glass border-border/50" />
          <Input type="number" placeholder="رقم الموسم" value={seasonNumber} onChange={(e) => setSeasonNumber(Number(e.target.value))} min={1} required className="glass border-border/50" dir="ltr" />
          <Input type="number" placeholder="عدد الحلقات" value={episodesCount} onChange={(e) => setEpisodesCount(Number(e.target.value))} min={1} required className="glass border-border/50" dir="ltr" />
          <Button type="submit" disabled={loading} className="w-full">{loading ? "جاري الإضافة..." : "إضافة"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddServerDialog({ animeId, onAdded }: { animeId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("servers").insert({ anime_id: animeId, name, base_url: baseUrl } as any);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { onAdded(); setOpen(false); setName(""); setBaseUrl(""); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><Plus size={14} /> إضافة سيرفر</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong neon-border">
        <DialogHeader><DialogTitle className="text-foreground">إضافة سيرفر</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="اسم السيرفر" value={name} onChange={(e) => setName(e.target.value)} required className="glass border-border/50" />
          <Input placeholder="رابط السيرفر الأساسي" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required className="glass border-border/50" dir="ltr" />
          <Button type="submit" disabled={loading} className="w-full">{loading ? "جاري الإضافة..." : "إضافة"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ table, id, onDeleted }: { table: string; id: string; onDeleted: () => void }) {
  const { toast } = useToast();
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else onDeleted();
  };
  return (
    <button onClick={handleDelete} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
      <Trash2 size={16} />
    </button>
  );
}

function ApiSettingsSection() {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchKey = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "ai_api_key")
        .maybeSingle();
      if (data) {
        setApiKey(data.value);
        setSavedKey(data.value);
      }
      setFetching(false);
    };
    fetchKey();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("settings" as any)
      .upsert({ key: "ai_api_key", value: apiKey, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setSavedKey(apiKey);
      toast({ title: "تم الحفظ", description: "تم حفظ مفتاح API بنجاح" });
    }
    setLoading(false);
  };

  return (
    <div className="mt-8 glass-strong rounded-2xl neon-border p-6">
      <h3 className="text-lg font-bold text-foreground neon-text flex items-center gap-2 mb-4">
        <Key size={18} className="text-primary" /> إعدادات API
      </h3>
      {fetching ? (
        <div className="h-10 glass rounded-xl animate-pulse" />
      ) : (
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-muted-foreground">مفتاح AI API</label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="glass border-border/50"
              dir="ltr"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={loading || apiKey === savedKey}
            className="gap-2"
          >
            <Save size={16} /> {loading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AiAdminSection({ onChanged }: { onChanged: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runPrompt = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { prompt: prompt.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReply(data?.reply || "تم تنفيذ الطلب");
      setResults(data?.results || []);
      onChanged();
      toast({ title: "تم", description: "نفّذ الذكاء الاصطناعي الطلب" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل تنفيذ الطلب", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="mt-8 glass-strong rounded-2xl neon-border p-6 space-y-4">
      <h3 className="text-lg font-bold text-foreground neon-text">وكيل AI للإدارة</h3>
      <p className="text-sm text-muted-foreground">
        اكتب طلبك باللغة الطبيعية مثل: "أضف أنمي جديد" أو "احذف السيرفر الفلاني" أو "اعرض آخر الأنميات".
      </p>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="مثال: أضف أنمي اسمه Attack on Titan مع وصف قصير"
        className="glass border-border/50"
      />
      <Button onClick={runPrompt} disabled={loading || !prompt.trim()} className="gap-2">
        <Sparkles size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "جاري التنفيذ..." : "تنفيذ بواسطة AI"}
      </Button>

      {reply && (
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{reply}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">نتائج العمليات</h4>
          {results.map((r, i) => (
            <div key={i} className="glass rounded-xl p-3 text-xs text-muted-foreground" dir="ltr">
              {JSON.stringify(r, null, 2)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JsonEditorSection({
  anime,
  seasons,
  servers,
  onSaved,
}: {
  anime: Anime;
  seasons: Season[];
  servers: ServerType[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState("");

  const buildJson = useCallback(() => {
    return JSON.stringify(
      {
        anime: {
          id: anime.id,
          title: anime.title,
          description: anime.description,
          poster_url: anime.poster_url,
        },
        seasons: seasons.map((s) => ({
          id: s.id,
          season_number: s.season_number,
          label: s.label,
          episodes_count: s.episodes_count,
        })),
        servers: servers.map((s) => ({
          id: s.id,
          name: s.name,
          base_url: s.base_url,
        })),
      },
      null,
      2
    );
  }, [anime, seasons, servers]);

  const [jsonText, setJsonText] = useState(buildJson());

  useEffect(() => {
    setJsonText(buildJson());
    setJsonError("");
  }, [buildJson]);

  const handleChange = (val: string) => {
    setJsonText(val);
    try {
      JSON.parse(val);
      setJsonError("");
    } catch {
      setJsonError("JSON غير صالح");
    }
  };

  const handleSave = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON غير صالح");
      return;
    }

    setSaving(true);
    try {
      // Update anime
      if (parsed.anime) {
        const { id, ...rest } = parsed.anime;
        await supabase.from("anime").update(rest as any).eq("id", anime.id);
      }

      // Update seasons
      if (parsed.seasons) {
        for (const s of parsed.seasons) {
          if (s.id) {
            const { id, ...rest } = s;
            await supabase.from("seasons").update({ ...rest, anime_id: anime.id } as any).eq("id", id);
          } else {
            await supabase.from("seasons").insert({ ...s, anime_id: anime.id } as any);
          }
        }
      }

      // Update servers
      if (parsed.servers) {
        for (const s of parsed.servers) {
          if (s.id) {
            const { id, ...rest } = s;
            await supabase.from("servers").update({ ...rest, anime_id: anime.id } as any).eq("id", id);
          } else {
            await supabase.from("servers").insert({ ...s, anime_id: anime.id } as any);
          }
        }
      }

      toast({ title: "تم الحفظ", description: "تم تحديث البيانات من JSON بنجاح" });
      onSaved();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل الحفظ", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleReset = () => {
    setJsonText(buildJson());
    setJsonError("");
  };

  return (
    <div className="mt-8 glass-strong rounded-2xl neon-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground neon-text flex items-center gap-2">
          <Code size={18} className="text-primary" /> محرر JSON
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
            <X size={14} /> إعادة تعيين
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !!jsonError} className="gap-1.5">
            <Check size={14} /> {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        عدّل بيانات الأنمي والمواسم والسيرفرات مباشرة. لإضافة موسم/سيرفر جديد أزل حقل "id".
      </p>

      {jsonError && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{jsonError}</div>
      )}

      <textarea
        value={jsonText}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full min-h-[400px] bg-secondary/30 border border-border/50 rounded-xl p-4 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
        dir="ltr"
        spellCheck={false}
      />
    </div>
  );
}

export default Admin;
