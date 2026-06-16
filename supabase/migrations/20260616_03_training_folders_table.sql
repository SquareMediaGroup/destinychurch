CREATE TABLE public.training_folders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  subgroup_id uuid NOT NULL REFERENCES public.training_subgroups(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT training_folders_pkey PRIMARY KEY (id)
);

ALTER TABLE public.training_folders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_posts 
  ADD COLUMN folder_id uuid REFERENCES public.training_folders(id) ON DELETE SET NULL,
  DROP COLUMN IF EXISTS folder_name;
