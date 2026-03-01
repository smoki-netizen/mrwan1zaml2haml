import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Anime } from "@/types/anime";

const Home = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 neon-border">
              <Film size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground neon-text md:text-2xl">
              أنمي بلس
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
          جميع الأنميات
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
                <div className="aspect-[3/4] w-full">
                  {anime.poster_url ? (
                    <img
                      src={anime.poster_url}
                      alt={anime.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                      <Film size={40} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-4 pt-10">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2">{anime.title}</h3>
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
      </main>
    </div>
  );
};

export default Home;
