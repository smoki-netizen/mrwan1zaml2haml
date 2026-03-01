
-- Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Anime table
CREATE TABLE public.anime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  poster_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;

-- Seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
  season_number INT NOT NULL,
  label TEXT NOT NULL,
  episodes_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Servers table (video sources)
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID REFERENCES public.anime(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- RLS: everyone can read, only admin can write
-- anime
CREATE POLICY "Anyone can read anime" ON public.anime FOR SELECT USING (true);
CREATE POLICY "Admin can insert anime" ON public.anime FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update anime" ON public.anime FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete anime" ON public.anime FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- seasons
CREATE POLICY "Anyone can read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admin can insert seasons" ON public.seasons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update seasons" ON public.seasons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete seasons" ON public.seasons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- servers
CREATE POLICY "Anyone can read servers" ON public.servers FOR SELECT USING (true);
CREATE POLICY "Admin can insert servers" ON public.servers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update servers" ON public.servers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete servers" ON public.servers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: admin can read/manage, users can read own
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
