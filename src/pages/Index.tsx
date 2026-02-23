import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

const TOTAL_EPISODES = 45;
const SEASON = "c0";

function getVideoUrl(episode: number) {
  return `https://ccdko80.com/videos/${SEASON}/EP${episode}.mp4`;
}

function getFavorites(): number[] {
  try {
    return JSON.parse(localStorage.getItem("conan-favorites") || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favs: number[]) {
  localStorage.setItem("conan-favorites", JSON.stringify(favs));
}

const Index = () => {
  const [currentEp, setCurrentEp] = useState(1);
  const [favorites, setFavorites] = useState<number[]>(getFavorites);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const toggleFav = (ep: number) => {
    setFavorites((prev) =>
      prev.includes(ep) ? prev.filter((e) => e !== ep) : [...prev, ep]
    );
  };

  const handleEnded = () => {
    if (currentEp < TOTAL_EPISODES) {
      setCurrentEp((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            🔍 المحقق كونان
          </h1>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            الموسم 0
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {/* Video Player */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="relative aspect-video w-full bg-black">
            <video
              key={currentEp}
              className="h-full w-full"
              controls
              autoPlay
              onEnded={handleEnded}
              src={getVideoUrl(currentEp)}
            >
              متصفحك لا يدعم الفيديو
            </video>
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
                    favorites.includes(currentEp)
                      ? "fill-heart-active text-heart-active"
                      : "text-muted-foreground"
                  }
                />
              </button>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentEp} / {TOTAL_EPISODES}
            </span>
          </div>
        </div>

        {/* Episodes Grid */}
        <h3 className="mb-4 text-lg font-bold text-foreground">الحلقات</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
          {Array.from({ length: TOTAL_EPISODES }, (_, i) => i + 1).map((ep) => {
            const isActive = ep === currentEp;
            const isFav = favorites.includes(ep);
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
