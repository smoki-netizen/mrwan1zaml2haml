import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import type { Anime } from "@/types/anime";

const Home = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSiteSettings();

  useEffect(() => {
    const fetchAnime = async () => {
      const { data } = await supabase.from("anime").select("*").order("created_at", { ascending: false });
      setAnimeList((data as Anime[]) || []);
      setLoading(false);
    };
    fetchAnime();
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-neon-purple/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.site_title}
                className="h-10 w-10 rounded-xl object-cover neon-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 neon-border ${settings.logo_url ? "hidden" : ""}`}>
              <Film size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground neon-text md:text-2xl">
              {settings.site_title}
            </h1>
          </div>
          <Link
            to="/admin"
            className="glass rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:text-primary hover:neon-border"
          >
            لوحة التحكم
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-8">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground">
          <Play size={20} className="text-primary" />
          {settings.hero_text}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : animeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد أنميات بعد</p>
            <p className="text-muted-foreground text-sm mt-1">أضف أنميات من لوحة التحكم</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {animeList.map((anime) => (
              <Link
                key={anime.id}
                to={`/watch/${anime.id}`}
                className="group relative overflow-hidden rounded-2xl neon-border glass transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  {anime.poster_url ? (
                    <img
                      src={anime.poster_url}
                      alt={anime.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement!.classList.add("flex", "items-center", "justify-center", "bg-secondary/30");
                        const icon = document.createElement("div");
                        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="2" y="2" rx="2"/><path d="m10 10 4 4m0-4-4 4"/></svg>`;
                        target.parentElement!.appendChild(icon);
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                      <Film size={40} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-4 pt-10">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2">{anime.title}</h3>
                  {anime.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{anime.description}</p>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 neon-border">
                    <Play size={24} className="text-primary" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        {settings.footer_text && (
          <footer className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">{settings.footer_text}</p>
          </footer>
        )}
      </main>
    </div>
  );
};

export default Home;
