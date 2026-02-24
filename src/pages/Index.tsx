import { useState, useEffect } from "react";
import { Heart, ChevronLeft, ChevronRight, Maximize, RotateCcw } from "lucide-react";
import { useRef, useCallback } from "react";

const SEASONS = Array.from({ length: 11 }, (_, i) => ({
  id: i,
  label: `الموسم ${i}`,
  code: `c${i}`,
  episodes: 45,
}));

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
  const [currentEp, setCurrentEp] = useState(() => lastWatched["c0"] || 1);
  const [favorites, setFavorites] = useState<Record<string, number[]>>(getFavorites);
  const [isFlipped, setIsFlipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
  }, []);

  const season = SEASONS[currentSeason];
  const seasonFavs = favorites[season.code] || [];

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // حفظ آخر حلقة تمت مشاهدتها
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
    <div className={`min-h-screen bg-background ${isFlipped ? "max-w-md mx-auto" : ""}`} style={isFlipped ? { minHeight: "100vw" } : {}}>
      {/* Header */}
      <header className="border-b border-border px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            🔍 المحقق كونان
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFlipped((f) => !f)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="قلب العرض والطول"
            >
              <RotateCcw size={18} />
            </button>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {season.label}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {/* Season Explorer */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-foreground">المواسم</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SEASONS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => selectSeason(idx)}
                className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${
                  idx === currentSeason
                    ? "border-primary bg-primary/15 text-primary shadow-lg shadow-primary/20"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video Player */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="relative aspect-video w-full bg-black">
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
            <button
              onClick={handleFullscreen}
              className="absolute top-3 left-3 rounded-lg bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              title="ملء الشاشة"
            >
              <Maximize size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">
                الحلقة {currentEp}
              </h2>
              <button
                onClick={() => toggleFav(currentEp)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Heart
                  size={24}
                  className={
                    seasonFavs.includes(currentEp)
                      ? "fill-heart-active text-heart-active"
                      : "text-muted-foreground"
                  }
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentEp((p) => Math.max(1, p - 1))}
                disabled={currentEp <= 1}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
              <span className="text-sm text-muted-foreground">
                {currentEp} / {season.episodes}
              </span>
              <button
                onClick={() => setCurrentEp((p) => Math.min(season.episodes, p + 1))}
                disabled={currentEp >= season.episodes}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Episodes Grid */}
        <h3 className="mb-4 text-lg font-bold text-foreground">الحلقات</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
          {Array.from({ length: season.episodes }, (_, i) => i + 1).map((ep) => {
            const isActive = ep === currentEp;
            const isFav = seasonFavs.includes(ep);
            return (
              <button
                key={ep}
                onClick={() => setCurrentEp(ep)}
                className={`group relative flex flex-col items-center justify-center rounded-lg border p-3 text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary shadow-lg shadow-primary/20"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
              >
                <span>{ep}</span>
                {isFav && (
                  <Heart
                    size={12}
                    className="absolute left-1.5 top-1.5 fill-heart-active text-heart-active"
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
