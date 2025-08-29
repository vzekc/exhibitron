-- drop the old FK
ALTER TABLE public.image_variant
  DROP CONSTRAINT image_variant_original_image_id_foreign;

-- (optional but recommended) ensure an index exists for performance
-- use CONCURRENTLY outside a transaction if your table is large:
CREATE INDEX IF NOT EXISTS idx_image_variant_original_image_id
  ON public.image_variant (original_image_id);

-- add FK with ON DELETE CASCADE
ALTER TABLE public.image_variant
  ADD CONSTRAINT image_variant_original_image_id_foreign
  FOREIGN KEY (original_image_id)
  REFERENCES public.image_storage(id)
  ON DELETE CASCADE;
