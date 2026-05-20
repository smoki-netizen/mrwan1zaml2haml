import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Film, Play, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import type { Anime } from "@/types/anime";

const Home = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const { settings } = useSiteSettings();

  useEffect(() => {
    const fetchAnime = async () => {
      const { data } = await supabase.from("anime").select("*").order("created_at", { ascending: false });
      setAnimeList((data as Anime[]) || []);
      setLoading(false);
    };
    fetchAnime();
  }, []);

  // Auto-rotate hero
  const featured = animeList.filter((a) => a.poster_url).slice(0, 5);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);

  const pageTitle = `${settings.site_title} - شاهد أفضل الأنميات مدبلجة بالعربية`;
  const pageDesc = settings.site_description || "شاهد جميع حلقات الأنميات مدبلجة بالعربية بجودة عالية مع سيرفرات متعددة.";

  const recent = animeList.slice(0, 12);
  const all = animeList;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href="https://mrwan1zaml2haml.lovable.app/" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content="https://mrwan1zaml2haml.lovable.app/" />
      </Helmet>

      {/* Header */}
      <header className="glass-strong fixed top-0 inset-x-0 z-50 px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_title} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Film size={18} className="text-primary-foreground" />
              </div>
            )}
            <h1 className="text-lg font-extrabold text-foreground md:text-xl">
              <span className="text-primary">{settings.site_title}</span>
            </h1>
          </div>
          <Link
            to="/admin"
            className="rounded-lg bg-secondary/80 px-4 py-2 text-xs font-bold text-foreground/80 transition-all hover:bg-primary hover:text-primary-foreground"
          >
            لوحة التحكم
          </Link>
        </div>
      </header>

      {/* Hero */}
      {featured.length > 0 && (
        <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden pt-16">
          {featured.map((a, idx) => (
            <div
              key={a.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === heroIdx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <img
                src={a.poster_url}
                alt={a.title}
                className="absolute inset-0 h-full w-full object-cover animate-hero-pan"
              />
              <div className="absolute inset-0 hero-gradient" />
              <div className="absolute inset-0 hero-gradient-side" />
              <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-6 pb-20 md:px-12 md:pb-28">
                <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  مميز الآن
                </span>
                <h2 className="mb-3 max-w-2xl text-3xl font-black text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
                  {a.title}
                </h2>
                {a.description && (
                  <p className="mb-6 max-w-xl text-sm text-white/80 line-clamp-3 md:text-base">
                    {a.description}
                  </p>
                )}
                <div className="flex gap-3">
                  <Link
                    to={`/watch/${a.id}`}
                    className="group flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-[0_0_30px_hsla(18,90%,54%,0.5)] md:text-base"
                  >
                    <Play size={18} className="fill-current" /> شاهد الآن
                  </Link>
                  <Link
                    to={`/watch/${a.id}`}
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/20 md:text-base"
                  >
                    <Info size={18} /> التفاصيل
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {featured.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroIdx(idx)}
                aria-label={`عرض الأنمي رقم ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === heroIdx ? "w-8 bg-primary" : "w-4 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[1600px] -mt-12 space-y-12 px-4 pb-20 md:px-8">
        {loading ? (
          <div className="space-y-8 pt-12">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="mb-4 h-6 w-40 rounded bg-secondary/50 animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="aspect-[2/3] w-44 shrink-0 rounded-lg bg-secondary/40 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : animeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد أنميات بعد</p>
          </div>
        ) : (
          <>
            <AnimeRow title="أُضيف حديثاً" items={recent} />
            <AnimeRow title={settings.hero_text || "جميع الأنميات"} items={all} />
          </>
        )}

        {settings.footer_text && (
          <footer className="mt-16 border-t border-border/40 pt-8 text-center">
            <p className="text-sm text-muted-foreground">{settings.footer_text}</p>
          </footer>
        )}
      </main>
    </div>
  );
};

// ============ Horizontal scrolling row ============
function AnimeRow({ title, items }: { title: string; items: Anime[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "next" | "prev") => {
    const el = scrollRef.current;
    if (!el) return;
    // RTL: "next" = move to show next items = scrollLeft becomes MORE negative
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "next" ? -amount : amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="group/row relative">
      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-foreground md:text-2xl">
          <span className="border-r-4 border-primary pr-3">{title}</span>
        </h2>
        <span className="text-xs text-muted-foreground">{items.length} عنوان</span>
      </div>
      <div className="relative">
        {/* Scroll buttons */}
        <button
          onClick={() => scroll("prev")}
          aria-label="السابق"
          className="absolute right-0 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-l-lg bg-background/80 p-2 text-foreground opacity-0 backdrop-blur transition-all group-hover/row:opacity-100 hover:bg-primary md:flex h-20"
        >
          <ChevronRight size={28} />
        </button>
        <button
          onClick={() => scroll("next")}
          aria-label="التالي"
          className="absolute left-0 top-1/2 z-30 hidden -translate-y-1/2 items-center justify-center rounded-r-lg bg-background/80 p-2 text-foreground opacity-0 backdrop-blur transition-all group-hover/row:opacity-100 hover:bg-primary md:flex h-20"
        >
          <ChevronLeft size={28} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hide pb-6 pt-2"
        >
          {items.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Link
      to={`/watch/${anime.id}`}
      className="card-tilt group/card relative block w-36 shrink-0 overflow-hidden rounded-lg bg-secondary md:w-44 lg:w-48"
    >
      <div className="aspect-[2/3] w-full overflow-hidden">
        {anime.poster_url ? (
          <img
            src={anime.poster_url}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              t.parentElement!.classList.add("flex", "items-center", "justify-center", "bg-secondary");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Film size={32} className="text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg">
          <Play size={18} className="fill-current text-primary-foreground" />
        </div>
        <h3 className="text-sm font-bold text-white line-clamp-2">{anime.title}</h3>
        {anime.description && (
          <p className="mt-1 text-[10px] text-white/70 line-clamp-2">{anime.description}</p>
        )}
      </div>
      {/* Always-visible title strip */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 transition-opacity duration-300 group-hover/card:opacity-0">
        <h3 className="text-xs font-bold text-white line-clamp-1">{anime.title}</h3>
      </div>
    </Link>
  );
}

export default Home;
