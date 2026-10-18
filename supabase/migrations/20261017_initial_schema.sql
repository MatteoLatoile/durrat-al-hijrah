BEGIN;

-- ============================================
-- DURRAT AL HIJRAH
-- BASE IMMOBILIERE SUPABASE
-- ============================================

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================
-- 1. ADMINISTRATEURS
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'editor'
        CHECK (role IN ('owner','admin','editor')),
    full_name text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. REGIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.regions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    names jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(names) = 'object')
);

-- ============================================
-- 3. VILLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.cities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
    slug text NOT NULL UNIQUE,
    names jsonb NOT NULL DEFAULT '{}'::jsonb,
    latitude double precision,
    longitude double precision,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(names) = 'object'),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180)
);

-- ============================================
-- 4. QUARTIERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.districts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id uuid NOT NULL
        REFERENCES public.cities(id) ON DELETE RESTRICT,
    slug text NOT NULL,
    names jsonb NOT NULL DEFAULT '{}'::jsonb,

    latitude double precision,
    longitude double precision,

    -- Contour GeoJSON facultatif pour une future carte.
    boundary_geojson jsonb,

    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(city_id, slug),
    CHECK (jsonb_typeof(names) = 'object'),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180)
);

-- ============================================
-- 5. ANNONCES IMMOBILIERES
-- ============================================

CREATE TABLE IF NOT EXISTS public.properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reference text NOT NULL UNIQUE DEFAULT (
        'DH-' || upper(substr(
            replace(gen_random_uuid()::text, '-', ''), 1, 10
        ))
    ),

    district_id uuid
        REFERENCES public.districts(id) ON DELETE RESTRICT,

    property_type text NOT NULL DEFAULT 'apartment'
        CHECK (property_type IN (
            'apartment',
            'villa',
            'studio',
            'land',
            'building',
            'shop',
            'office',
            'warehouse',
            'other'
        )),

    transaction_type text NOT NULL DEFAULT 'sale'
        CHECK (transaction_type IN ('sale','rent')),

    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'published',
            'sold',
            'rented',
            'archived'
        )),

    rent_period text
        CHECK (
            rent_period IS NULL OR
            rent_period IN ('daily','monthly','yearly')
        ),

    title jsonb NOT NULL DEFAULT '{}'::jsonb,
    description jsonb NOT NULL DEFAULT '{}'::jsonb,

    price numeric(14,2) NOT NULL DEFAULT 0,
    price_on_request boolean NOT NULL DEFAULT false,

    area_m2 numeric(12,2),
    land_area_m2 numeric(12,2),

    bedrooms integer,
    bathrooms integer,
    living_rooms integer,

    floor_number integer,
    total_floors integer,
    parking_spaces integer,
    property_age_years integer,

    furnished text DEFAULT 'unfurnished'
        CHECK (furnished IN (
            'furnished',
            'unfurnished',
            'partially_furnished'
        )),

    street_width_m numeric(8,2),

    -- Position publique facultative.
    -- La carte principale reste regroupee par quartier.
    latitude double precision,
    longitude double precision,

    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,

    is_featured boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,

    available_from date,

    published_at timestamptz,

    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CHECK (price >= 0),
    CHECK (area_m2 IS NULL OR area_m2 > 0),
    CHECK (land_area_m2 IS NULL OR land_area_m2 > 0),
    CHECK (bedrooms IS NULL OR bedrooms >= 0),
    CHECK (bathrooms IS NULL OR bathrooms >= 0),
    CHECK (living_rooms IS NULL OR living_rooms >= 0),
    CHECK (parking_spaces IS NULL OR parking_spaces >= 0),
    CHECK (property_age_years IS NULL OR property_age_years >= 0),
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180),
    CHECK (jsonb_typeof(title) = 'object'),
    CHECK (jsonb_typeof(description) = 'object'),
    CHECK (jsonb_typeof(attributes) = 'object')
);

-- ============================================
-- 6. INFORMATIONS PRIVEES DU BIEN
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_private (
    property_id uuid PRIMARY KEY
        REFERENCES public.properties(id) ON DELETE CASCADE,

    owner_name text,
    owner_phone text,
    owner_email text,

    exact_address text,
    exact_latitude double precision,
    exact_longitude double precision,

    owner_notes text,
    internal_notes text,

    commission_amount numeric(14,2),
    commission_percentage numeric(5,2),

    updated_at timestamptz NOT NULL DEFAULT now(),

    CHECK (exact_latitude BETWEEN -90 AND 90),
    CHECK (exact_longitude BETWEEN -180 AND 180),
    CHECK (
        commission_percentage IS NULL OR
        commission_percentage BETWEEN 0 AND 100
    )
);

-- ============================================
-- 7. PHOTOS DES ANNONCES
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    property_id uuid NOT NULL
        REFERENCES public.properties(id) ON DELETE CASCADE,

    storage_path text NOT NULL,
    alt_text jsonb NOT NULL DEFAULT '{}'::jsonb,

    sort_order integer NOT NULL DEFAULT 0,
    is_cover boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(property_id, storage_path),
    CHECK (sort_order >= 0),
    CHECK (jsonb_typeof(alt_text) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS
property_images_one_cover
ON public.property_images(property_id)
WHERE is_cover = true;

-- ============================================
-- 8. EQUIPEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.amenities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    names jsonb NOT NULL DEFAULT '{}'::jsonb,
    icon text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(names) = 'object')
);

-- ============================================
-- 9. EQUIPEMENTS PAR ANNONCE
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_amenities (
    property_id uuid NOT NULL
        REFERENCES public.properties(id) ON DELETE CASCADE,

    amenity_id uuid NOT NULL
        REFERENCES public.amenities(id) ON DELETE CASCADE,

    PRIMARY KEY(property_id, amenity_id)
);

-- ============================================
-- 10. PROSPECTS WHATSAPP
-- ============================================

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    property_id uuid
        REFERENCES public.properties(id) ON DELETE SET NULL,

    full_name text NOT NULL,
    whatsapp_phone text NOT NULL,
    email text,

    message text,

    preferred_language text NOT NULL DEFAULT 'ar'
        CHECK (preferred_language IN (
            'ar','fr','en','ru','ur','id'
        )),

    source text NOT NULL DEFAULT 'website'
        CHECK (source IN (
            'website','whatsapp','phone','manual','other'
        )),

    status text NOT NULL DEFAULT 'new'
        CHECK (status IN (
            'new',
            'contacted',
            'qualified',
            'closed',
            'spam'
        )),

    -- Consentement recueilli avant enregistrement.
    privacy_consent_at timestamptz NOT NULL,
    privacy_policy_version text NOT NULL DEFAULT 'v1',

    internal_notes text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CHECK (length(trim(full_name)) >= 2),
    CHECK (length(trim(whatsapp_phone)) >= 6)
);

-- Aucun champ nationalite.

-- ============================================
-- 11. HISTORIQUE DES PROSPECTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    lead_id uuid NOT NULL
        REFERENCES public.leads(id) ON DELETE CASCADE,

    action text NOT NULL,
    note text,

    admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 12. HISTORIQUE DES STATUTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    property_id uuid NOT NULL
        REFERENCES public.properties(id) ON DELETE CASCADE,

    old_status text,
    new_status text NOT NULL,

    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 13. PARAMETRES DE L'AGENCE
-- ============================================

CREATE TABLE IF NOT EXISTS public.agency_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    agency_name jsonb NOT NULL DEFAULT '{}'::jsonb,
    about_text jsonb NOT NULL DEFAULT '{}'::jsonb,
    address_text jsonb NOT NULL DEFAULT '{}'::jsonb,

    phone text,
    whatsapp_phone text,
    email text,

    website_url text,

    default_language text NOT NULL DEFAULT 'ar',
    currency text NOT NULL DEFAULT 'SAR',

    logo_path text,

    intro_animation_enabled boolean NOT NULL DEFAULT true,

    social_links jsonb NOT NULL DEFAULT '{}'::jsonb,

    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.agency_settings (
    id,
    agency_name
)
VALUES (
    1,
    jsonb_build_object(
        'ar','درة الهجرة للعقارات',
        'fr','Durrat Al Hijrah',
        'en','Durrat Al Hijrah',
        'ru','Durrat Al Hijrah',
        'ur','درۃ الہجرہ',
        'id','Durrat Al Hijrah'
    )
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 14. CANAUX TELEGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    label text NOT NULL,
    chat_id text NOT NULL UNIQUE,

    language text NOT NULL DEFAULT 'ar'
        CHECK (language IN (
            'ar','fr','en','ru','ur','id'
        )),

    is_active boolean NOT NULL DEFAULT true,
    auto_publish boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Le token du bot ne doit jamais etre stocke ici.
-- Il sera conserve dans les variables serveur.

-- ============================================
-- 15. FILE DE PUBLICATION TELEGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    property_id uuid NOT NULL
        REFERENCES public.properties(id) ON DELETE CASCADE,

    channel_id uuid NOT NULL
        REFERENCES public.telegram_channels(id) ON DELETE CASCADE,

    action text NOT NULL
        CHECK (action IN ('publish','update','unpublish')),

    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending','processing','sent','failed'
        )),

    attempts integer NOT NULL DEFAULT 0,

    telegram_message_id text,
    last_error text,

    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CHECK (attempts >= 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cities_region
ON public.cities(region_id);

CREATE INDEX IF NOT EXISTS idx_districts_city
ON public.districts(city_id);

CREATE INDEX IF NOT EXISTS idx_properties_district
ON public.properties(district_id);

CREATE INDEX IF NOT EXISTS idx_properties_public
ON public.properties(status, transaction_type, property_type);

CREATE INDEX IF NOT EXISTS idx_properties_price
ON public.properties(price);

CREATE INDEX IF NOT EXISTS idx_properties_area
ON public.properties(area_m2);

CREATE INDEX IF NOT EXISTS idx_properties_featured
ON public.properties(is_featured);

CREATE INDEX IF NOT EXISTS idx_property_images_property
ON public.property_images(property_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity
ON public.property_amenities(amenity_id);

CREATE INDEX IF NOT EXISTS idx_leads_created
ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status
ON public.leads(status);

CREATE INDEX IF NOT EXISTS idx_leads_property
ON public.leads(property_id);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead
ON public.lead_activities(lead_id);

CREATE INDEX IF NOT EXISTS idx_telegram_jobs_pending
ON public.telegram_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_property_status_history_property
ON public.property_status_history(property_id, created_at DESC);

-- ============================================
-- MISE A JOUR AUTOMATIQUE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'admin_users',
        'regions',
        'cities',
        'districts',
        'properties',
        'property_private',
        'amenities',
        'leads',
        'agency_settings',
        'telegram_channels',
        'telegram_jobs'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS set_updated_at ON public.%I',
            tbl
        );

        EXECUTE format(
            'CREATE TRIGGER set_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.touch_updated_at()',
            tbl
        );
    END LOOP;
END;
$$;

-- ============================================
-- DATE DE PUBLICATION
-- ============================================

CREATE OR REPLACE FUNCTION public.prepare_property()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'published'
       AND NEW.published_at IS NULL THEN
        NEW.published_at = now();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_property
ON public.properties;

CREATE TRIGGER prepare_property
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.prepare_property();

-- ============================================
-- HISTORIQUE AUTOMATIQUE DES STATUTS
-- ============================================

CREATE OR REPLACE FUNCTION public.record_property_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.property_status_history (
            property_id,
            old_status,
            new_status,
            changed_by
        )
        VALUES (
            NEW.id,
            NULL,
            NEW.status,
            (SELECT auth.uid())
        );

    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.property_status_history (
            property_id,
            old_status,
            new_status,
            changed_by
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            (SELECT auth.uid())
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_property_status
ON public.properties;

CREATE TRIGGER record_property_status
AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.record_property_status();

-- ============================================
-- PREPARATION DES PUBLICATIONS TELEGRAM
-- ============================================

CREATE OR REPLACE FUNCTION public.queue_telegram_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    requested_action text;
BEGIN

    IF TG_OP = 'INSERT' THEN

        IF NEW.status <> 'published' THEN
            RETURN NEW;
        END IF;

        requested_action := 'publish';

    ELSE

        IF NEW.status = 'published'
           AND OLD.status <> 'published' THEN

            requested_action := 'publish';

        ELSIF OLD.status = 'published'
              AND NEW.status <> 'published' THEN

            requested_action := 'unpublish';

        ELSIF NEW.status = 'published'
              AND (
                NEW.title IS DISTINCT FROM OLD.title OR
                NEW.description IS DISTINCT FROM OLD.description OR
                NEW.price IS DISTINCT FROM OLD.price OR
                NEW.district_id IS DISTINCT FROM OLD.district_id OR
                NEW.property_type IS DISTINCT FROM OLD.property_type
              ) THEN

            requested_action := 'update';

        ELSE
            RETURN NEW;
        END IF;

    END IF;

    INSERT INTO public.telegram_jobs (
        property_id,
        channel_id,
        action
    )
    SELECT
        NEW.id,
        channel.id,
        requested_action
    FROM public.telegram_channels AS channel
    WHERE channel.is_active = true
      AND channel.auto_publish = true;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_telegram_property
ON public.properties;

CREATE TRIGGER queue_telegram_property
AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.queue_telegram_property();

-- ============================================
-- SECURITE DES ADMINISTRATEURS
-- ============================================

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users AS a
        WHERE a.id = (SELECT auth.uid())
          AND a.is_active = true
          AND a.role IN ('owner','admin','editor')
    );
$$;

CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users AS a
        WHERE a.id = (SELECT auth.uid())
          AND a.is_active = true
          AND a.role = 'owner'
    );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_owner() FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_owner()
TO authenticated;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_jobs ENABLE ROW LEVEL SECURITY;

-- Retirer les privileges publics automatiques.

REVOKE ALL ON
    public.admin_users,
    public.regions,
    public.cities,
    public.districts,
    public.properties,
    public.property_private,
    public.property_images,
    public.amenities,
    public.property_amenities,
    public.leads,
    public.lead_activities,
    public.property_status_history,
    public.agency_settings,
    public.telegram_channels,
    public.telegram_jobs
FROM anon, authenticated;

-- Les visiteurs peuvent lire les donnees publiques.

GRANT SELECT ON
    public.regions,
    public.cities,
    public.districts,
    public.properties,
    public.property_images,
    public.amenities,
    public.property_amenities,
    public.agency_settings
TO anon;

-- Les utilisateurs connectes ont des droits SQL.
-- Les politiques RLS limitent ensuite les actions aux admins.

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.admin_users,
    public.regions,
    public.cities,
    public.districts,
    public.properties,
    public.property_private,
    public.property_images,
    public.amenities,
    public.property_amenities,
    public.leads,
    public.lead_activities,
    public.agency_settings,
    public.telegram_channels,
    public.telegram_jobs
TO authenticated;

GRANT SELECT ON public.property_status_history
TO authenticated;

-- Lecture publique des donnees actives.

CREATE POLICY regions_public_read
ON public.regions
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY cities_public_read
ON public.cities
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY districts_public_read
ON public.districts
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY properties_public_read
ON public.properties
FOR SELECT TO anon, authenticated
USING (status = 'published');

CREATE POLICY amenities_public_read
ON public.amenities
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY settings_public_read
ON public.agency_settings
FOR SELECT TO anon, authenticated
USING (true);

-- Photos uniquement associees aux annonces publiees.

CREATE POLICY images_public_read
ON public.property_images
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties AS p
        WHERE p.id = property_id
          AND p.status = 'published'
    )
);

-- Equipements des annonces publiees.

CREATE POLICY property_amenities_public_read
ON public.property_amenities
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.properties AS p
        WHERE p.id = property_id
          AND p.status = 'published'
    )
);

-- Administrateurs :
-- gestion des annonces, villes, quartiers, demandes et Telegram.

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'regions',
        'cities',
        'districts',
        'properties',
        'property_private',
        'property_images',
        'amenities',
        'property_amenities',
        'leads',
        'lead_activities',
        'agency_settings',
        'telegram_channels',
        'telegram_jobs'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY admin_all
             ON public.%I
             FOR ALL TO authenticated
             USING ((SELECT private.is_admin()))
             WITH CHECK ((SELECT private.is_admin()))',
            tbl
        );
    END LOOP;
END;
$$;

-- Seul le proprietaire administrateur peut gerer les comptes.

CREATE POLICY admin_users_read
ON public.admin_users
FOR SELECT TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_owner())
);

CREATE POLICY admin_users_owner_insert
ON public.admin_users
FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_owner()));

CREATE POLICY admin_users_owner_update
ON public.admin_users
FOR UPDATE TO authenticated
USING ((SELECT private.is_owner()))
WITH CHECK ((SELECT private.is_owner()));

CREATE POLICY admin_users_owner_delete
ON public.admin_users
FOR DELETE TO authenticated
USING ((SELECT private.is_owner()));

-- Historique accessible uniquement aux administrateurs.

CREATE POLICY property_history_admin_read
ON public.property_status_history
FOR SELECT TO authenticated
USING ((SELECT private.is_admin()));

-- ============================================
-- STORAGE : PHOTOS IMMOBILIERES
-- ============================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'property-images',
    'property-images',
    true,
    10485760,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Seuls les administrateurs peuvent televerser.

CREATE POLICY durrat_images_admin_select
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'property-images'
    AND (SELECT private.is_admin())
);

CREATE POLICY durrat_images_admin_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'property-images'
    AND (SELECT private.is_admin())
);

CREATE POLICY durrat_images_admin_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'property-images'
    AND (SELECT private.is_admin())
)
WITH CHECK (
    bucket_id = 'property-images'
    AND (SELECT private.is_admin())
);

CREATE POLICY durrat_images_admin_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'property-images'
    AND (SELECT private.is_admin())
);

-- ============================================
-- QUELQUES VILLES DU ROYAUME
-- ============================================

INSERT INTO public.cities (
    slug,
    names,
    latitude,
    longitude
)
VALUES

(
    'madinah',
    '{"ar":"المدينة المنورة","fr":"Médine","en":"Madinah","ru":"Медина","ur":"مدینہ منورہ","id":"Madinah"}'::jsonb,
    24.4672,
    39.6111
),

(
    'makkah',
    '{"ar":"مكة المكرمة","fr":"La Mecque","en":"Makkah","ru":"Мекка","ur":"مکہ مکرمہ","id":"Makkah"}'::jsonb,
    21.4225,
    39.8262
),

(
    'riyadh',
    '{"ar":"الرياض","fr":"Riyad","en":"Riyadh","ru":"Эр-Рияд","ur":"ریاض","id":"Riyadh"}'::jsonb,
    24.7136,
    46.6753
),

(
    'jeddah',
    '{"ar":"جدة","fr":"Djeddah","en":"Jeddah","ru":"Джидда","ur":"جدہ","id":"Jeddah"}'::jsonb,
    21.5433,
    39.1728
),

(
    'dammam',
    '{"ar":"الدمام","fr":"Dammam","en":"Dammam","ru":"Даммам","ur":"دمام","id":"Dammam"}'::jsonb,
    26.4207,
    50.0888
)

ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'admin_users',
    'regions',
    'cities',
    'districts',
    'properties',
    'property_private',
    'property_images',
    'amenities',
    'property_amenities',
    'leads',
    'lead_activities',
    'property_status_history',
    'agency_settings',
    'telegram_channels',
    'telegram_jobs'
  )
ORDER BY table_name;