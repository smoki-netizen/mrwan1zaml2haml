import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, ChevronLeft, ChevronRight, Maximize, RotateCcw, Cast, Play, Film } from "lucide-react";

const SEASONS = [
  { id: 1, label: "الجزء 1", code: "c1", episodes: 40 },
  { id: 2, label: "الجزء 2", code: "c2", episodes: 40 },
  { id: 3, label: "الجزء 3", code: "c3", episodes: 44 },
  { id: 4, label: "الجزء 4", code: "c4", episodes: 52 },
  { id: 5, label: "الجزء 5", code: "c5", episodes: 52 },
  { id: 6, label: "الجزء 6", code: "c6", episodes: 52 },
  { id: 7, label: "الجزء 7", code: "c7", episodes: 52 },
  { id: 8, label: "الجزء 8", code: "c8", episodes: 52 },
  { id: 9, label: "الجزء 9", code: "c9", episodes: 52 },
  { id: 10, label: "الجزء 10", code: "c10", episodes: 54 },
];

function getVideoUrl(seasonCode: string, episode: number) {
  return `https://ccdko80.com/videos/${seasonCode}/EP${episode}.mp4`;
}

function getFavorites(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem("conan-favorites-v2") || "{}");
  } catch {
    return {};
  }
}

function saveFavorites(favs: Record<string, number[]>) {
  localStorage.setItem("conan-favorites-v2", JSON.stringify(favs));
}

function getLastWatched(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("conan-last-watched") || "{}");
  } catch {
    return {};
  }
}

function saveLastWatched(data: Record<string, number>) {
  localStorage.setItem("conan-last-watched", JSON.stringify(data));
}

const Index = () => {
  const [lastWatched, setLastWatched] = useState<Record<string, number>>(getLastWatched);
  const [currentSeason, setCurrentSeason] = useState(0);
  const [currentEp, setCurrentEp] = useState(() => lastWatched["c1"] || 1);
  const [favorites, setFavorites] = useState<Record<string, number[]>>(getFavorites);
  const [isFlipped, setIsFlipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
  }, []);

  const handleCast = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      }
    } catch (e) {
      console.error("PiP not supported", e);
    }
  }, []);

  const season = SEASONS[currentSeason];
  const seasonFavs = favorites[season.code] || [];

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    setLastWatched((prev) => {
      const updated = { ...prev, [season.code]: currentEp };
      saveLastWatched(updated);
      return updated;
    });
  }, [currentEp, season.code]);

  const toggleFav = (ep: number) => {
    setFavorites((prev) => {
      const key = season.code;
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.includes(ep) ? list.filter((e) => e !== ep) : [...list, ep],
      };
    });
  };

  const handleEnded = () => {
    if (currentEp < season.episodes) {
      setCurrentEp((prev) => prev + 1);
    }
  };

  const selectSeason = (idx: number) => {
    setCurrentSeason(idx);
    const code = SEASONS[idx].code;
    setCurrentEp(lastWatched[code] || 1);
  };

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
              المحقق كونان
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFlipped((f) => !f)}
              className="glass rounded-xl p-2 text-muted-foreground transition-all hover:text-primary hover:neon-border"
              title="قلب العرض والطول"
            >
              <RotateCcw size={18} />
            </button>
            <span className="glass neon-border rounded-full px-4 py-1.5 text-xs font-bold text-primary neon-text">
              {season.label}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Season Explorer */}
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <Play size={18} className="text-primary" />
            المواسم
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {SEASONS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => selectSeason(idx)}
                className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 ${
                  idx === currentSeason
                    ? "neon-border bg-primary/10 text-primary neon-text shadow-lg shadow-primary/20"
                    : "glass text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Player */}
        <div className="mb-8 overflow-hidden rounded-2xl neon-border glass-strong cinematic-shadow">
          <div className={`relative w-full bg-black/80 ${isFlipped ? "aspect-[9/16]" : "aspect-video"} transition-all duration-500`}>
            <video
              ref={videoRef}
              key={`${season.code}-${currentEp}`}
              className="h-full w-full"
              controls
              autoPlay
              onEnded={handleEnded}
              src={getVideoUrl(season.code, currentEp)}
            >
              متصفحك لا يدعم الفيديو
            </video>
            <div className="absolute top-4 left-4 flex gap-2">
              <button
                onClick={handleFullscreen}
                className="glass rounded-xl p-2.5 text-foreground/70 transition-all hover:text-primary hover:neon-border"
                title="ملء الشاشة"
              >
                <Maximize size={18} />
              </button>
              <button
                onClick={handleCast}
                className="glass rounded-xl p-2.5 text-foreground/70 transition-all hover:text-primary hover:neon-border"
                title="نشر الشاشة"
              >
                <Cast size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-foreground">
                الحلقة {currentEp}
              </h2>
              <button
                onClick={() => toggleFav(currentEp)}
                className="transition-all duration-300 hover:scale-125 active:scale-95"
              >
                <Heart
                  size={24}
                  className={
                    seasonFavs.includes(currentEp)
                      ? "fill-heart-active text-heart-active drop-shadow-[0_0_8px_hsla(0,90%,60%,0.5)]"
                      : "text-muted-foreground hover:text-heart-active"
                  }
                />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentEp((p) => Math.max(1, p - 1))}
                disabled={currentEp <= 1}
                className="glass rounded-xl p-2 text-muted-foreground transition-all hover:text-primary hover:neon-border disabled:opacity-20"
              >
                <ChevronRight size={20} />
              </button>
              <span className="glass rounded-lg px-3 py-1 text-sm font-semibold text-primary tabular-nums">
                {currentEp} / {season.episodes}
              </span>
              <button
                onClick={() => setCurrentEp((p) => Math.min(season.episodes, p + 1))}
                disabled={currentEp >= season.episodes}
                className="glass rounded-xl p-2 text-muted-foreground transition-all hover:text-primary hover:neon-border disabled:opacity-20"
              >
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
          {Array.from({ length: season.episodes }, (_, i) => i + 1).map((ep) => {
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
                  <Heart
                    size={10}
                    className="absolute left-1.5 top-1.5 fill-heart-active text-heart-active drop-shadow-[0_0_4px_hsla(0,90%,60%,0.5)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Index;
