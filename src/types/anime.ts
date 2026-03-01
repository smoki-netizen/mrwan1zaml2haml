export interface Anime {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  created_at: string;
}

export interface Season {
  id: string;
  anime_id: string;
  season_number: number;
  label: string;
  episodes_count: number;
  created_at: string;
}

export interface Server {
  id: string;
  anime_id: string;
  name: string;
  base_url: string;
  created_at: string;
}
