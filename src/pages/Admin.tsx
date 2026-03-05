import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Plus, Trash2, Edit2, LogOut, Server, Layers, Key, Save, Sparkles } from "lucide-react";
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

        {/* API Settings */}
        <ApiSettingsSection />
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
  const { toast } = useToast();

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
          <Textarea placeholder="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} className="glass border-border/50" />
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

export default Admin;
