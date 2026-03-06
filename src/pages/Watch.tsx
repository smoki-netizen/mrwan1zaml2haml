import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, Maximize, Cast, Play, Film, ArrowRight, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Anime, Season, Server as ServerType } from "@/types/anime";

function getFavorites(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem("anime-favorites-v2") || "{}");
  } catch {
    return {};
  }
}
function saveFavorites(favs: Record<string, number[]>) {
  localStorage.setItem("anime-favorites-v2", JSON.stringify(favs));
}
function getLastWatched(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("anime-last-watched") || "{}");
  } catch {
    return {};
  }
}
function saveLastWatched(data: Record<string, number>) {
  localStorage.setItem("anime-last-watched", JSON.stringify(data));
}

const Watch = () => {
  const { animeId } = useParams<{ animeId: string }>();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [currentSeasonIdx, setCurrentSeasonIdx] = useState(0);
  const [currentEp, setCurrentEp] = useState(1);
  const [currentServerId, setCurrentServerId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, number[]>>(getFavorites);
  const [lastWatched, setLastWatched] = useState<Record<string, number>>(getLastWatched);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!animeId) return;
    const fetchData = async () => {
      const [animeRes, seasonsRes, serversRes] = await Promise.all([
        supabase.from("anime").select("*").eq("id", animeId).single(),
        supabase.from("seasons").select("*").eq("anime_id", animeId).order("season_number"),
        supabase.from("servers").select("*").eq("anime_id", animeId).order("created_at"),
      ]);
      setAnime(animeRes.data as Anime);
      setSeasons((seasonsRes.data as Season[]) || []);
      const serversList = (serversRes.data as ServerType[]) || [];
      setServers(serversList);
      if (serversList.length > 0) setCurrentServerId(serversList[0].id);
      setLoading(false);
    };
    fetchData();
  }, [animeId]);

  // Restore last watched episode
  useEffect(() => {
    if (seasons.length > 0) {
      const key = seasons[0]?.id;
      if (key && lastWatched[key]) setCurrentEp(lastWatched[key]);
    }
  }, [seasons]);

  const season = seasons[currentSeasonIdx];
  const currentServer = servers.find((s) => s.id === currentServerId);

  const getVideoUrl = () => {
    if (!currentServer || !season) return "";
    return `${currentServer.base_url}/c${season.season_number}/EP${currentEp}.mp4`;
  };

  const seasonKey = season?.id || "";
  const seasonFavs = favorites[seasonKey] || [];

  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => {
    if (!seasonKey) return;
    setLastWatched((prev) => {
      const updated = { ...prev, [seasonKey]: currentEp };
      saveLastWatched(updated);
      return updated;
    });
  }, [currentEp, seasonKey]);

  const toggleFav = (ep: number) => {
    setFavorites((prev) => {
      const list = prev[seasonKey] || [];
      return { ...prev, [seasonKey]: list.includes(ep) ? list.filter((e) => e !== ep) : [...list, ep] };
    });
  };

  const handleEnded = () => {
    if (season && currentEp < season.episodes_count) setCurrentEp((p) => p + 1);
  };

  const selectSeason = (idx: number) => {
    setCurrentSeasonIdx(idx);
    const key = seasons[idx]?.id;
    setCurrentEp(key && lastWatched[key] ? lastWatched[key] : 1);
  };

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (video?.requestFullscreen) video.requestFullscreen();
  }, []);

  const handleCast = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      }
    } catch {}
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass rounded-2xl p-8 neon-border animate-pulse">
        <Film size={40} className="text-primary mx-auto" />
      </div>
    </div>
  );

  if (!anime) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">الأنمي غير موجود</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <header className="glass-strong sticky top-0 z-50 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="glass rounded-xl p-2 text-muted-foreground hover:text-primary hover:neon-border transition-all">
              <ArrowRight size={18} />
            </Link>
            <h1 className="text-xl font-bold text-foreground neon-text md:text-2xl">{anime.title}</h1>
          </div>
          {season && (
            <span className="glass neon-border rounded-full px-4 py-1.5 text-xs font-bold text-primary neon-text">
              {season.label}
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Server selector */}
        {servers.length > 1 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
              <Server size={18} className="text-primary" />
              السيرفرات
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {servers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentServerId(s.id)}
                  className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                    s.id === currentServerId
                      ? "neon-border bg-primary/10 text-primary neon-text shadow-lg shadow-primary/20"
                      : "glass text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seasons */}
        {seasons.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <Play size={18} className="text-primary" />
              المواسم
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {seasons.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => selectSeason(idx)}
                  className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                    idx === currentSeasonIdx
                      ? "neon-border bg-primary/10 text-primary neon-text shadow-lg shadow-primary/20"
                      : "glass text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Video Player */}
        {season && (
          <>
            <div className="mb-8 overflow-hidden rounded-2xl neon-border glass-strong cinematic-shadow">
              <div className="relative w-full bg-black/80 aspect-video">
                <video
                  ref={videoRef}
                  key={`${currentServerId}-${seasonKey}-${currentEp}`}
                  className="h-full w-full"
                  controls
                  autoPlay
                  onEnded={handleEnded}
                  src={getVideoUrl()}
                >
                  متصفحك لا يدعم الفيديو
                </video>
                <div className="absolute top-4 left-4 flex gap-2">
                  <button onClick={handleFullscreen} className="glass rounded-xl p-2.5 text-foreground/70 hover:text-primary hover:neon-border transition-all" title="ملء الشاشة">
                    <Maximize size={18} />
                  </button>
                  <button onClick={handleCast} className="glass rounded-xl p-2.5 text-foreground/70 hover:text-primary hover:neon-border transition-all" title="صورة في صورة">
                    <Cast size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-foreground">الحلقة {currentEp}</h2>
                  <button onClick={() => toggleFav(currentEp)} className="transition-all duration-300 hover:scale-125 active:scale-95">
                    <Heart
                      size={24}
                      className={seasonFavs.includes(currentEp)
                        ? "fill-heart-active text-heart-active drop-shadow-[0_0_8px_hsla(0,90%,60%,0.5)]"
                        : "text-muted-foreground hover:text-heart-active"
                      }
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCurrentEp((p) => Math.max(1, p - 1))} disabled={currentEp <= 1} className="glass rounded-xl p-2 text-muted-foreground hover:text-primary hover:neon-border disabled:opacity-20 transition-all">
                    <ChevronRight size={20} />
                  </button>
                  <span className="glass rounded-lg px-3 py-1 text-sm font-semibold text-primary tabular-nums">
                    {currentEp} / {season.episodes_count}
                  </span>
                  <button onClick={() => setCurrentEp((p) => Math.min(season.episodes_count, p + 1))} disabled={currentEp >= season.episodes_count} className="glass rounded-xl p-2 text-muted-foreground hover:text-primary hover:neon-border disabled:opacity-20 transition-all">
                    <ChevronLeft size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Episodes Grid */}
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
              <Film size={18} className="text-primary" />
              الحلقات
            </h3>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {Array.from({ length: season.episodes_count }, (_, i) => i + 1).map((ep) => {
                const isActive = ep === currentEp;
                const isFav = seasonFavs.includes(ep);
                return (
                  <button
                    key={ep}
                    onClick={() => setCurrentEp(ep)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl p-3 text-sm font-bold transition-all duration-300 hover:scale-110 active:scale-95 ${
                      isActive
                        ? "neon-border bg-primary/15 text-primary neon-text shadow-lg shadow-primary/25"
                        : "glass text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span>{ep}</span>
                    {isFav && (
                      <Heart size={10} className="absolute left-1.5 top-1.5 fill-heart-active text-heart-active drop-shadow-[0_0_4px_hsla(0,90%,60%,0.5)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {seasons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد مواسم بعد</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Watch;
