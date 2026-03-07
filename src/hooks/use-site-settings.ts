import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  site_title: string;
  site_description: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  hero_text: string;
  footer_text: string;
}

const defaults: SiteSettings = {
  site_title: "أنمي بلس",
  site_description: "شاهد أفضل الأنميات مدبلجة بالعربية",
  primary_color: "",
  accent_color: "",
  logo_url: "",
  hero_text: "جميع الأنميات",
  footer_text: "",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", Object.keys(defaults));

      if (data) {
        const merged = { ...defaults };
        for (const row of data) {
          if (row.key in merged && row.value) {
            (merged as any)[row.key] = row.value;
          }
        }
        setSettings(merged);

        // Apply dynamic colors
        if (merged.primary_color) {
          document.documentElement.style.setProperty("--primary", merged.primary_color);
        }
        if (merged.accent_color) {
          document.documentElement.style.setProperty("--accent", merged.accent_color);
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { settings, loading };
}
