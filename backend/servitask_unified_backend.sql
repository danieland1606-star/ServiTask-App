-- ============================================================================
-- SERVI TASK — BACKEND UNIFICADO SUPABASE (PostgreSQL)
-- Versión: 2.0 — Compatible con ServiTask App (React Native) + Tasker View (Flutter)
-- ============================================================================
-- Instrucciones de despliegue:
--   1. Ejecutar en el SQL Editor de Supabase (proyecto limpio)
--   2. Habilitar las extensiones postgis y pg_trgm desde Settings > Database
--   3. Configurar los Storage Buckets según la sección 11
--   4. Habilitar Realtime según la sección 10
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 0: EXTENSIONES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";     -- geolocalización y búsqueda por radio
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- búsqueda fuzzy de texto


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 1: TIPOS ENUMERADOS (ENUMs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('client', 'tasker', 'admin');

CREATE TYPE verification_status AS ENUM (
  'pending', 'verified', 'rejected', 'suspended'
);

CREATE TYPE task_status AS ENUM (
  'draft', 'published', 'matched', 'confirmed', 'in_progress',
  'pending_review', 'completed', 'cancelled', 'disputed'
);

-- Estado de la solicitud simplificada (app React Native)
CREATE TYPE job_status AS ENUM (
  'pending', 'matched', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE application_status AS ENUM (
  'pending', 'accepted', 'rejected', 'withdrawn', 'expired'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'held', 'released', 'refunded',
  'partially_refunded', 'failed', 'disputed'
);

CREATE TYPE payment_method AS ENUM (
  'credit_card', 'debit_card', 'bank_transfer',
  'mobile_wallet', 'platform_credit'
);

CREATE TYPE notification_type AS ENUM (
  'task_new_request', 'task_accepted', 'task_rejected',
  'task_started', 'task_completed', 'task_cancelled',
  'payment_held', 'payment_released', 'payment_refunded',
  'review_received', 'chat_message', 'dispute_opened',
  'dispute_resolved', 'document_verified', 'document_rejected',
  'tier_upgrade', 'promotion', 'system'
);

CREATE TYPE document_type AS ENUM (
  'cedula_front', 'cedula_back', 'selfie_biometric',
  'criminal_record', 'professional_cert', 'insurance_policy', 'tool_inspection'
);

CREATE TYPE claim_status AS ENUM (
  'submitted', 'under_review', 'approved', 'denied', 'paid_out'
);

CREATE TYPE claim_type AS ENUM (
  'property_damage', 'bodily_injury', 'theft'
);

CREATE TYPE task_size AS ENUM (
  'small', 'medium', 'large', 'project'
);

CREATE TYPE availability_type AS ENUM (
  'available', 'busy', 'personal', 'synced'
);

CREATE TYPE tasker_tier AS ENUM (
  'new', 'standard', 'pro', 'platinum'
);

CREATE TYPE dispute_status AS ENUM (
  'opened', 'investigating', 'resolved_favor_client',
  'resolved_favor_tasker', 'resolved_partial', 'escalated', 'closed'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 2: TABLAS CORE
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. profiles ────────────────────────────────────────────────────────────
-- Perfil base de todos los usuarios. Extiende auth.users.
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           user_role        NOT NULL DEFAULT 'client',
  full_name      TEXT             NOT NULL,
  email          TEXT             UNIQUE NOT NULL,
  phone          TEXT,
  phone_verified BOOLEAN          DEFAULT FALSE,
  avatar_url     TEXT,
  date_of_birth  DATE,
  province       TEXT,
  city           TEXT,
  address_line   TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  locale         TEXT             DEFAULT 'es-EC',
  is_active      BOOLEAN          DEFAULT TRUE,
  is_online      BOOLEAN          DEFAULT FALSE,
  last_seen_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ      DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Perfil base unificado de clientes, taskers y admins.';


-- ─── 2. tasker_profiles ─────────────────────────────────────────────────────
CREATE TABLE public.tasker_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_status   verification_status DEFAULT 'pending',
  verified_at           TIMESTAMPTZ,
  background_check_date DATE,
  background_check_ok   BOOLEAN DEFAULT FALSE,
  psychometric_test_ok  BOOLEAN DEFAULT FALSE,
  bio                   TEXT,
  years_experience      INT DEFAULT 0,
  service_radius_km     NUMERIC(5,1) DEFAULT 10.0,
  base_hourly_rate      NUMERIC(10,2),
  has_own_tools         BOOLEAN DEFAULT TRUE,
  has_vehicle           BOOLEAN DEFAULT FALSE,
  tier                  tasker_tier DEFAULT 'new',
  total_tasks_completed INT DEFAULT 0,
  total_earnings        NUMERIC(12,2) DEFAULT 0.00,
  average_rating        NUMERIC(3,2) DEFAULT 0.00,
  response_rate         NUMERIC(5,2) DEFAULT 0.00,
  acceptance_rate       NUMERIC(5,2) DEFAULT 0.00,
  punctuality_rate      NUMERIC(5,2) DEFAULT 0.00,
  google_calendar_token TEXT,
  google_calendar_email TEXT,
  accepts_emergency     BOOLEAN DEFAULT FALSE,
  min_task_price        NUMERIC(10,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.tasker_profiles IS 'Datos extendidos del Tasker: KYC, tier, métricas, preferencias de servicio.';


-- ─── 3. verification_documents ──────────────────────────────────────────────
CREATE TABLE public.verification_documents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type    document_type NOT NULL,
  file_url         TEXT NOT NULL,
  status           verification_status DEFAULT 'pending',
  reviewed_by      UUID REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at       DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 4. categories & subcategories ──────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url    TEXT,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  is_mvp      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subcategories (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id                UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  slug                       TEXT NOT NULL,
  description                TEXT,
  icon_url                   TEXT,
  image_url                  TEXT,
  base_price                 NUMERIC(10,2),
  estimated_duration_minutes INT,
  sort_order                 INT DEFAULT 0,
  is_active                  BOOLEAN DEFAULT TRUE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);


-- ─── 5. tasker_skills ───────────────────────────────────────────────────────
CREATE TABLE public.tasker_skills (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id          UUID NOT NULL REFERENCES public.tasker_profiles(id) ON DELETE CASCADE,
  subcategory_id     UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  custom_hourly_rate NUMERIC(10,2),
  years_experience   INT DEFAULT 0,
  is_verified        BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tasker_id, subcategory_id)
);


-- ─── 6. saved_addresses ─────────────────────────────────────────────────────
CREATE TABLE public.saved_addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Casa',
  address_line TEXT NOT NULL,
  city         TEXT,
  province     TEXT,
  reference    TEXT,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  is_default   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 7. tasks ───────────────────────────────────────────────────────────────
-- Tabla central del ciclo de vida de servicios. Usada por la app Flutter (Tasker View).
CREATE TABLE public.tasks (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id                UUID NOT NULL REFERENCES public.profiles(id),
  assigned_tasker_id       UUID REFERENCES public.profiles(id),
  category_id              UUID NOT NULL REFERENCES public.categories(id),
  subcategory_id           UUID NOT NULL REFERENCES public.subcategories(id),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  photos                   TEXT[],
  task_size                task_size DEFAULT 'medium',
  tools_required           TEXT[],
  address_id               UUID REFERENCES public.saved_addresses(id),
  address_line             TEXT NOT NULL,
  city                     TEXT,
  latitude                 DOUBLE PRECISION NOT NULL,
  longitude                DOUBLE PRECISION NOT NULL,
  preferred_date           DATE,
  preferred_time           TIME,
  is_flexible_date         BOOLEAN DEFAULT FALSE,
  is_emergency             BOOLEAN DEFAULT FALSE,
  estimated_duration_hours NUMERIC(4,1),
  client_min_budget        NUMERIC(10,2),
  client_max_budget        NUMERIC(10,2),
  agreed_price             NUMERIC(10,2),
  platform_fee             NUMERIC(10,2),
  total_price              NUMERIC(10,2),
  status                   task_status DEFAULT 'draft',
  published_at             TIMESTAMPTZ,
  confirmed_at             TIMESTAMPTZ,
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancellation_reason      TEXT,
  photos_before            TEXT[],
  photos_after             TEXT[],
  response_deadline        TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.tasks IS 'Ciclo de vida completo de una tarea. Usado por la app Tasker (Flutter).';


-- ─── 8. jobs ────────────────────────────────────────────────────────────────
-- Solicitudes simplificadas de servicios. Usada por la app ServiTask (React Native).
-- Complementa a tasks: job = solicitud inicial del cliente antes de matching completo.
CREATE TABLE public.jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID NOT NULL REFERENCES public.profiles(id),
  category       TEXT NOT NULL,           -- slug de categoría (ej. 'reparaciones')
  subcategory    TEXT,                    -- nombre(s) de subcategoría seleccionados
  details        TEXT,                    -- descripción del trabajo
  price_min      NUMERIC(10,2) DEFAULT 0,
  price_max      NUMERIC(10,2) DEFAULT 0,
  location_label TEXT,                    -- dirección legible
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  status         job_status DEFAULT 'pending',
  task_id        UUID REFERENCES public.tasks(id), -- vinculado al task completo cuando se formaliza
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.jobs IS 'Solicitudes rápidas de servicio de la app cliente (React Native). Se formalizan en tasks al hacer matching.';


-- ─── 9. proposals ───────────────────────────────────────────────────────────
-- Propuestas de taskers a jobs (app React Native).
CREATE TABLE public.proposals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tasker_id      UUID NOT NULL REFERENCES public.profiles(id),
  message        TEXT,
  proposed_price NUMERIC(10,2),
  status         application_status DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, tasker_id)
);
COMMENT ON TABLE public.proposals IS 'Propuestas de Taskers a solicitudes (jobs). App React Native.';


-- ─── 10. task_applications ──────────────────────────────────────────────────
-- Postulaciones formales de taskers a tasks publicadas. App Flutter.
CREATE TABLE public.task_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tasker_id       UUID NOT NULL REFERENCES public.profiles(id),
  proposed_price  NUMERIC(10,2),
  message         TEXT,
  estimated_hours NUMERIC(4,1),
  status          application_status DEFAULT 'pending',
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, tasker_id)
);


-- ─── 11. payments ───────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID REFERENCES public.tasks(id),
  job_id            UUID REFERENCES public.jobs(id),  -- para pagos de jobs directos
  client_id         UUID NOT NULL REFERENCES public.profiles(id),
  tasker_id         UUID NOT NULL REFERENCES public.profiles(id),
  subtotal          NUMERIC(10,2) NOT NULL,
  platform_fee      NUMERIC(10,2) NOT NULL,
  tip_amount        NUMERIC(10,2) DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL,
  tasker_payout     NUMERIC(10,2) NOT NULL,
  status            payment_status DEFAULT 'pending',
  payment_method    payment_method,
  gateway_provider  TEXT,
  gateway_tx_id     TEXT,
  gateway_response  JSONB,
  held_at           TIMESTAMPTZ,
  released_at       TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  refund_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT payment_has_task_or_job CHECK (task_id IS NOT NULL OR job_id IS NOT NULL)
);
COMMENT ON TABLE public.payments IS 'Sistema Escrow. Soporta pagos de tasks (Flutter) y jobs (React Native).';


-- ─── 12. payment_methods ────────────────────────────────────────────────────
CREATE TABLE public.payment_methods (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method_type    payment_method NOT NULL,
  label          TEXT,
  card_last_four CHAR(4),
  card_brand     TEXT,
  gateway_token  TEXT,
  is_default     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 13. tasker_bank_accounts ───────────────────────────────────────────────
CREATE TABLE public.tasker_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id      UUID NOT NULL REFERENCES public.tasker_profiles(id) ON DELETE CASCADE,
  bank_name      TEXT NOT NULL,
  account_type   TEXT NOT NULL CHECK (account_type IN ('ahorro', 'corriente')),
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  id_number      TEXT NOT NULL,
  is_default     BOOLEAN DEFAULT TRUE,
  is_verified    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 14. reviews ────────────────────────────────────────────────────────────
-- NOTA: La app React Native usa 'target_id'; la app Flutter usa 'reviewee_id'.
-- Ambos son la misma columna. La columna canónica es 'reviewee_id'.
-- La app React Native debe actualizarse para usar 'reviewee_id'.
-- Se provee la vista v_reviews_compat (sección 9) como puente temporal.
CREATE TABLE public.reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id              UUID REFERENCES public.tasks(id),
  job_id               UUID REFERENCES public.jobs(id),   -- para reviews de jobs
  reviewer_id          UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_id          UUID NOT NULL REFERENCES public.profiles(id),  -- = target_id
  rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment              TEXT,
  is_public            BOOLEAN DEFAULT TRUE,
  rating_quality       SMALLINT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_punctuality   SMALLINT CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_communication SMALLINT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_value         SMALLINT CHECK (rating_value BETWEEN 1 AND 5),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, reviewer_id),
  CONSTRAINT review_has_task_or_job CHECK (task_id IS NOT NULL OR job_id IS NOT NULL)
);


-- ─── 15. conversations ──────────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  job_id     UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.profiles(id),
  tasker_id  UUID NOT NULL REFERENCES public.profiles(id),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conv_has_task_or_job CHECK (task_id IS NOT NULL OR job_id IS NOT NULL)
);
-- Una conversación por task y por job
CREATE UNIQUE INDEX idx_conv_task ON public.conversations(task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX idx_conv_job  ON public.conversations(job_id)  WHERE job_id IS NOT NULL;


-- ─── 16. messages ───────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id),
  content         TEXT,
  image_url       TEXT,
  is_system       BOOLEAN DEFAULT FALSE,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 17. notifications ──────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 18. availability_blocks ────────────────────────────────────────────────
CREATE TABLE public.availability_blocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id       UUID NOT NULL REFERENCES public.tasker_profiles(id) ON DELETE CASCADE,
  block_type      availability_type NOT NULL DEFAULT 'available',
  title           TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);


-- ─── 19. disputes ───────────────────────────────────────────────────────────
CREATE TABLE public.disputes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID REFERENCES public.tasks(id),
  job_id           UUID REFERENCES public.jobs(id),
  opened_by        UUID NOT NULL REFERENCES public.profiles(id),
  assigned_admin   UUID REFERENCES public.profiles(id),
  reason           TEXT NOT NULL,
  description      TEXT NOT NULL,
  evidence_urls    TEXT[],
  status           dispute_status DEFAULT 'opened',
  resolution_notes TEXT,
  refund_amount    NUMERIC(10,2),
  opened_at        TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 20. happiness_pledge_claims ────────────────────────────────────────────
CREATE TABLE public.happiness_pledge_claims (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID REFERENCES public.tasks(id),
  job_id           UUID REFERENCES public.jobs(id),
  claimant_id      UUID NOT NULL REFERENCES public.profiles(id),
  claim_type       claim_type NOT NULL,
  description      TEXT NOT NULL,
  evidence_urls    TEXT[],
  estimated_damage NUMERIC(10,2),
  approved_amount  NUMERIC(10,2) CHECK (approved_amount <= 10000),
  status           claim_status DEFAULT 'submitted',
  reviewed_by      UUID REFERENCES public.profiles(id),
  review_notes     TEXT,
  payment_id       UUID REFERENCES public.payments(id),
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 21. favorites ──────────────────────────────────────────────────────────
CREATE TABLE public.favorites (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tasker_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, tasker_id)
);


-- ─── 22. referrals ──────────────────────────────────────────────────────────
CREATE TABLE public.referrals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id   UUID NOT NULL REFERENCES public.profiles(id),
  referred_id   UUID REFERENCES public.profiles(id),
  referral_code TEXT NOT NULL UNIQUE,
  referral_type TEXT NOT NULL DEFAULT 'user' CHECK (referral_type IN ('user', 'tasker')),
  reward_amount NUMERIC(10,2) DEFAULT 5.00,
  is_redeemed   BOOLEAN DEFAULT FALSE,
  redeemed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 23. wallet & wallet_transactions ───────────────────────────────────────
CREATE TABLE public.wallet (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance    NUMERIC(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id      UUID NOT NULL REFERENCES public.wallet(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  description    TEXT NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('referral', 'task_payment', 'job_payment', 'promotion', 'refund')),
  reference_id   UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 24. search_history ─────────────────────────────────────────────────────
CREATE TABLE public.search_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query          TEXT NOT NULL,
  category_id    UUID REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 25. notification_preferences ───────────────────────────────────────────
CREATE TABLE public.notification_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled      BOOLEAN DEFAULT TRUE,
  sms_enabled       BOOLEAN DEFAULT FALSE,
  email_enabled     BOOLEAN DEFAULT TRUE,
  push_token        TEXT,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ─── 26. safety_reports ─────────────────────────────────────────────────────
CREATE TABLE public.safety_reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID REFERENCES public.tasks(id),
  job_id           UUID REFERENCES public.jobs(id),
  reporter_id      UUID NOT NULL REFERENCES public.profiles(id),
  reported_user_id UUID REFERENCES public.profiles(id),
  report_type      TEXT NOT NULL CHECK (report_type IN ('safety_concern', 'harassment', 'fraud', 'emergency')),
  description      TEXT NOT NULL,
  evidence_urls    TEXT[],
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  is_emergency     BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  assigned_admin   UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);


-- ─── 27. audit_log ──────────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.audit_log IS 'Log inmutable de acciones críticas del sistema. Solo admins pueden leerlo.';


-- ─── 28. tasker_earnings_summary ────────────────────────────────────────────
CREATE TABLE public.tasker_earnings_summary (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasker_id          UUID NOT NULL REFERENCES public.tasker_profiles(id) ON DELETE CASCADE,
  period_type        TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  subtotal_services  NUMERIC(12,2) DEFAULT 0,
  platform_fee_total NUMERIC(12,2) DEFAULT 0,
  tips_total         NUMERIC(12,2) DEFAULT 0,
  net_payout         NUMERIC(12,2) DEFAULT 0,
  tasks_completed    INT DEFAULT 0,
  tasks_cancelled    INT DEFAULT 0,
  average_rating     NUMERIC(3,2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tasker_id, period_type, period_start)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 3: ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_tasker_profiles_user_id     ON public.tasker_profiles(user_id);
CREATE INDEX idx_tasker_profiles_tier        ON public.tasker_profiles(tier);
CREATE INDEX idx_tasker_profiles_verification ON public.tasker_profiles(verification_status);
CREATE INDEX idx_tasker_profiles_rating      ON public.tasker_profiles(average_rating DESC);

CREATE INDEX idx_verification_docs_user      ON public.verification_documents(user_id);

CREATE INDEX idx_subcategories_category      ON public.subcategories(category_id);

CREATE INDEX idx_tasker_skills_tasker        ON public.tasker_skills(tasker_id);
CREATE INDEX idx_tasker_skills_subcategory   ON public.tasker_skills(subcategory_id);

CREATE INDEX idx_saved_addresses_user        ON public.saved_addresses(user_id);

CREATE INDEX idx_tasks_client               ON public.tasks(client_id);
CREATE INDEX idx_tasks_tasker               ON public.tasks(assigned_tasker_id);
CREATE INDEX idx_tasks_status               ON public.tasks(status);
CREATE INDEX idx_tasks_category             ON public.tasks(category_id);
CREATE INDEX idx_tasks_subcategory          ON public.tasks(subcategory_id);
CREATE INDEX idx_tasks_created              ON public.tasks(created_at DESC);
CREATE INDEX idx_tasks_location             ON public.tasks USING gist (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

CREATE INDEX idx_jobs_client                ON public.jobs(client_id);
CREATE INDEX idx_jobs_status                ON public.jobs(status);
CREATE INDEX idx_jobs_created               ON public.jobs(created_at DESC);

CREATE INDEX idx_proposals_job              ON public.proposals(job_id);
CREATE INDEX idx_proposals_tasker           ON public.proposals(tasker_id);

CREATE INDEX idx_applications_task          ON public.task_applications(task_id);
CREATE INDEX idx_applications_tasker        ON public.task_applications(tasker_id);
CREATE INDEX idx_applications_status        ON public.task_applications(status);

CREATE INDEX idx_payments_task              ON public.payments(task_id);
CREATE INDEX idx_payments_job               ON public.payments(job_id);
CREATE INDEX idx_payments_client            ON public.payments(client_id);
CREATE INDEX idx_payments_tasker            ON public.payments(tasker_id);
CREATE INDEX idx_payments_status            ON public.payments(status);

CREATE INDEX idx_payment_methods_user       ON public.payment_methods(user_id);
CREATE INDEX idx_tasker_bank_tasker         ON public.tasker_bank_accounts(tasker_id);

CREATE INDEX idx_reviews_task               ON public.reviews(task_id);
CREATE INDEX idx_reviews_reviewee           ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer           ON public.reviews(reviewer_id);

CREATE INDEX idx_messages_conversation      ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender            ON public.messages(sender_id);

CREATE INDEX idx_notifications_user         ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread       ON public.notifications(user_id) WHERE is_read = FALSE;

CREATE INDEX idx_availability_tasker        ON public.availability_blocks(tasker_id, start_time);

CREATE INDEX idx_disputes_task              ON public.disputes(task_id);
CREATE INDEX idx_disputes_status            ON public.disputes(status);

CREATE INDEX idx_hpc_task                   ON public.happiness_pledge_claims(task_id);
CREATE INDEX idx_hpc_status                 ON public.happiness_pledge_claims(status);

CREATE INDEX idx_referrals_referrer         ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code             ON public.referrals(referral_code);

CREATE INDEX idx_search_history_user        ON public.search_history(user_id, created_at DESC);

CREATE INDEX idx_safety_reports_task        ON public.safety_reports(task_id);
CREATE INDEX idx_safety_reports_status      ON public.safety_reports(status);

CREATE INDEX idx_audit_log_actor            ON public.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_entity           ON public.audit_log(entity_type, entity_id);

CREATE INDEX idx_earnings_tasker            ON public.tasker_earnings_summary(tasker_id, period_start DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 4: DATOS SEMILLA — CATEGORÍAS Y SUBCATEGORÍAS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.categories (name, slug, sort_order, is_active, is_mvp) VALUES
  ('Reparaciones', 'reparaciones', 1, TRUE, TRUE),
  ('Limpieza',     'limpieza',     2, TRUE, TRUE),
  ('Clases',       'clases',       3, TRUE, FALSE),
  ('Tecnología',   'tecnologia',   4, TRUE, FALSE),
  ('Construcción', 'construccion', 5, TRUE, FALSE),
  ('Exteriores',   'exteriores',   6, TRUE, FALSE),
  ('Automotriz',   'automotriz',   7, TRUE, FALSE),
  ('Otros',        'otros',        8, TRUE, FALSE);

INSERT INTO public.subcategories (category_id, name, slug, base_price, estimated_duration_minutes, sort_order) VALUES
  -- Reparaciones
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Handyman',          'handyman',          25.00, 90,  1),
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Plomería',          'plomeria',          30.00, 120, 2),
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Electricidad',      'electricidad',      35.00, 120, 3),
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Electrodomésticos', 'electrodomesticos', 25.00, 90,  4),
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Mecánica',          'mecanica',          30.00, 120, 5),
  ((SELECT id FROM public.categories WHERE slug='reparaciones'), 'Otros',             'reparaciones-otros',20.00, 60,  6),
  -- Limpieza
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Residencial',        'residencial',    20.00, 120, 1),
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Oficinas y Locales', 'oficinas-locales',25.00, 180, 2),
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Deep Cleaning',      'deep-cleaning',  35.00, 300, 3),
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Car Wash',           'car-wash',       15.00, 60,  4),
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Piscinas',           'piscinas',       40.00, 180, 5),
  ((SELECT id FROM public.categories WHERE slug='limpieza'), 'Otros',              'limpieza-otros', 15.00, 60,  6),
  -- Clases
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Inglés',      'ingles',      15.00, 60, 1),
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Matemática',  'matematica',  15.00, 60, 2),
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Física',      'fisica',      15.00, 60, 3),
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Química',     'quimica',     15.00, 60, 4),
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Idiomas',     'idiomas',     15.00, 60, 5),
  ((SELECT id FROM public.categories WHERE slug='clases'), 'Otros',       'clases-otros',12.00, 60, 6),
  -- Tecnología
  ((SELECT id FROM public.categories WHERE slug='tecnologia'), 'Soporte Técnico PC',     'soporte-pc', 20.00, 60, 1),
  ((SELECT id FROM public.categories WHERE slug='tecnologia'), 'Redes e Internet',       'redes',      25.00, 90, 2),
  ((SELECT id FROM public.categories WHERE slug='tecnologia'), 'Instalación Smart Home', 'smart-home', 35.00, 120,3),
  ((SELECT id FROM public.categories WHERE slug='tecnologia'), 'Otros',                  'tech-otros', 20.00, 60, 4),
  -- Construcción
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Montaje / Ensamblaje Ligero',  'montaje-ligero',    20.00, 90,  1),
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Montaje / Ensamblaje General', 'montaje-general',   30.00, 180, 2),
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Pintura',                      'pintura',           25.00, 240, 3),
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Albañilería',                  'albanileria',       35.00, 300, 4),
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Drywall',                      'drywall',           30.00, 240, 5),
  ((SELECT id FROM public.categories WHERE slug='construccion'), 'Otros',                        'construccion-otros',20.00, 120, 6),
  -- Exteriores
  ((SELECT id FROM public.categories WHERE slug='exteriores'), 'Jardinería',      'jardineria',     20.00, 120, 1),
  ((SELECT id FROM public.categories WHERE slug='exteriores'), 'Riego y Drenaje', 'riego-drenaje',  25.00, 120, 2),
  ((SELECT id FROM public.categories WHERE slug='exteriores'), 'Otros',           'exteriores-otros',15.00, 60,  3),
  -- Automotriz
  ((SELECT id FROM public.categories WHERE slug='automotriz'), 'Mecánica General',       'mecanica-general', 30.00, 120, 1),
  ((SELECT id FROM public.categories WHERE slug='automotriz'), 'Electricidad Automotriz','electricidad-auto', 35.00, 120, 2),
  ((SELECT id FROM public.categories WHERE slug='automotriz'), 'Aire Acondicionado',     'ac-auto',           40.00, 90,  3),
  ((SELECT id FROM public.categories WHERE slug='automotriz'), 'Otros',                  'automotriz-otros',  20.00, 60,  4);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 5: ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasker_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasker_skills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasker_bank_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happiness_pledge_claims   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasker_earnings_summary   ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares de roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_tasker()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'tasker');
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"    ON public.profiles FOR ALL   USING (public.is_admin());

-- ─── tasker_profiles ────────────────────────────────────────────────────────
CREATE POLICY "tp_select_all"         ON public.tasker_profiles FOR SELECT USING (TRUE);
CREATE POLICY "tp_insert_own"         ON public.tasker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_update_own"         ON public.tasker_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tp_admin_all"          ON public.tasker_profiles FOR ALL    USING (public.is_admin());

-- ─── verification_documents ─────────────────────────────────────────────────
CREATE POLICY "vdoc_select_own"       ON public.verification_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vdoc_insert_own"       ON public.verification_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vdoc_admin_all"        ON public.verification_documents FOR ALL    USING (public.is_admin());

-- ─── categories & subcategories ─────────────────────────────────────────────
CREATE POLICY "cat_select_public"     ON public.categories    FOR SELECT USING (TRUE);
CREATE POLICY "cat_admin_all"         ON public.categories    FOR ALL    USING (public.is_admin());
CREATE POLICY "subcat_select_public"  ON public.subcategories FOR SELECT USING (TRUE);
CREATE POLICY "subcat_admin_all"      ON public.subcategories FOR ALL    USING (public.is_admin());

-- ─── tasker_skills ──────────────────────────────────────────────────────────
CREATE POLICY "skills_select_all"     ON public.tasker_skills FOR SELECT USING (TRUE);
CREATE POLICY "skills_manage_own"     ON public.tasker_skills FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.tasker_profiles WHERE id = tasker_id)
);

-- ─── saved_addresses ────────────────────────────────────────────────────────
CREATE POLICY "addr_manage_own"       ON public.saved_addresses FOR ALL USING (auth.uid() = user_id);

-- ─── tasks ──────────────────────────────────────────────────────────────────
CREATE POLICY "tasks_select_client"   ON public.tasks FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "tasks_select_tasker"   ON public.tasks FOR SELECT USING (auth.uid() = assigned_tasker_id);
CREATE POLICY "tasks_select_published" ON public.tasks FOR SELECT USING (status = 'published' AND public.is_tasker());
CREATE POLICY "tasks_insert_client"   ON public.tasks FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "tasks_update_parts"    ON public.tasks FOR UPDATE USING (
  auth.uid() = client_id OR auth.uid() = assigned_tasker_id
);
CREATE POLICY "tasks_admin_all"       ON public.tasks FOR ALL USING (public.is_admin());

-- ─── jobs ───────────────────────────────────────────────────────────────────
CREATE POLICY "jobs_select_client"    ON public.jobs FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "jobs_select_tasker"    ON public.jobs FOR SELECT USING (status = 'pending' AND public.is_tasker());
CREATE POLICY "jobs_insert_client"    ON public.jobs FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "jobs_update_client"    ON public.jobs FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "jobs_admin_all"        ON public.jobs FOR ALL USING (public.is_admin());

-- ─── proposals ──────────────────────────────────────────────────────────────
CREATE POLICY "prop_select_tasker"    ON public.proposals FOR SELECT USING (auth.uid() = tasker_id);
CREATE POLICY "prop_select_client"    ON public.proposals FOR SELECT USING (
  auth.uid() = (SELECT client_id FROM public.jobs WHERE id = job_id)
);
CREATE POLICY "prop_insert_tasker"    ON public.proposals FOR INSERT WITH CHECK (auth.uid() = tasker_id);
CREATE POLICY "prop_update_tasker"    ON public.proposals FOR UPDATE USING (auth.uid() = tasker_id);
CREATE POLICY "prop_admin_all"        ON public.proposals FOR ALL USING (public.is_admin());

-- ─── task_applications ──────────────────────────────────────────────────────
CREATE POLICY "app_select_tasker"     ON public.task_applications FOR SELECT USING (auth.uid() = tasker_id);
CREATE POLICY "app_select_client"     ON public.task_applications FOR SELECT USING (
  auth.uid() = (SELECT client_id FROM public.tasks WHERE id = task_id)
);
CREATE POLICY "app_insert_tasker"     ON public.task_applications FOR INSERT WITH CHECK (auth.uid() = tasker_id);
CREATE POLICY "app_update_tasker"     ON public.task_applications FOR UPDATE USING (auth.uid() = tasker_id);
CREATE POLICY "app_admin_all"         ON public.task_applications FOR ALL USING (public.is_admin());

-- ─── payments ───────────────────────────────────────────────────────────────
CREATE POLICY "pay_select_client"     ON public.payments FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "pay_select_tasker"     ON public.payments FOR SELECT USING (auth.uid() = tasker_id);
CREATE POLICY "pay_insert_client"     ON public.payments FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "pay_admin_all"         ON public.payments FOR ALL USING (public.is_admin());

-- ─── payment_methods ────────────────────────────────────────────────────────
CREATE POLICY "pm_manage_own"         ON public.payment_methods FOR ALL USING (auth.uid() = user_id);

-- ─── tasker_bank_accounts ───────────────────────────────────────────────────
CREATE POLICY "bank_manage_own"       ON public.tasker_bank_accounts FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.tasker_profiles WHERE id = tasker_id)
);

-- ─── reviews ────────────────────────────────────────────────────────────────
CREATE POLICY "rev_select_public"     ON public.reviews FOR SELECT USING (is_public = TRUE);
CREATE POLICY "rev_select_own"        ON public.reviews FOR SELECT USING (
  auth.uid() = reviewer_id OR auth.uid() = reviewee_id
);
CREATE POLICY "rev_insert_own"        ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "rev_admin_all"         ON public.reviews FOR ALL USING (public.is_admin());

-- ─── conversations ──────────────────────────────────────────────────────────
CREATE POLICY "conv_select_parts"     ON public.conversations FOR SELECT USING (
  auth.uid() = client_id OR auth.uid() = tasker_id
);
CREATE POLICY "conv_insert_parts"     ON public.conversations FOR INSERT WITH CHECK (
  auth.uid() = client_id OR auth.uid() = tasker_id
);
CREATE POLICY "conv_admin_all"        ON public.conversations FOR ALL USING (public.is_admin());

-- ─── messages ───────────────────────────────────────────────────────────────
CREATE POLICY "msg_select_parts"      ON public.messages FOR SELECT USING (
  auth.uid() IN (
    SELECT client_id FROM public.conversations WHERE id = conversation_id
    UNION
    SELECT tasker_id FROM public.conversations WHERE id = conversation_id
  )
);
CREATE POLICY "msg_insert_own"        ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_update_own"        ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- ─── notifications ──────────────────────────────────────────────────────────
CREATE POLICY "notif_select_own"      ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own"      ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- Los triggers del sistema insertan notificaciones con SECURITY DEFINER, no necesita policy de INSERT.

-- ─── availability_blocks ────────────────────────────────────────────────────
CREATE POLICY "avail_select_all"      ON public.availability_blocks FOR SELECT USING (TRUE);
CREATE POLICY "avail_manage_own"      ON public.availability_blocks FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.tasker_profiles WHERE id = tasker_id)
);

-- ─── disputes ───────────────────────────────────────────────────────────────
CREATE POLICY "disp_select_parts"     ON public.disputes FOR SELECT USING (
  auth.uid() = opened_by OR auth.uid() = assigned_admin OR
  auth.uid() IN (SELECT client_id FROM public.tasks WHERE id = task_id) OR
  auth.uid() IN (SELECT assigned_tasker_id FROM public.tasks WHERE id = task_id)
);
CREATE POLICY "disp_insert_own"       ON public.disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);
CREATE POLICY "disp_admin_all"        ON public.disputes FOR ALL USING (public.is_admin());

-- ─── happiness_pledge_claims ────────────────────────────────────────────────
CREATE POLICY "hpc_select_own"        ON public.happiness_pledge_claims FOR SELECT USING (auth.uid() = claimant_id);
CREATE POLICY "hpc_insert_own"        ON public.happiness_pledge_claims FOR INSERT WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY "hpc_admin_all"         ON public.happiness_pledge_claims FOR ALL USING (public.is_admin());

-- ─── favorites ──────────────────────────────────────────────────────────────
CREATE POLICY "fav_manage_own"        ON public.favorites FOR ALL USING (auth.uid() = client_id);

-- ─── referrals ──────────────────────────────────────────────────────────────
CREATE POLICY "ref_select_own"        ON public.referrals FOR SELECT USING (
  auth.uid() = referrer_id OR auth.uid() = referred_id
);
CREATE POLICY "ref_insert_own"        ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- ─── wallet ─────────────────────────────────────────────────────────────────
CREATE POLICY "wallet_select_own"     ON public.wallet FOR SELECT USING (auth.uid() = user_id);
-- INSERT y UPDATE manejados por triggers SECURITY DEFINER

-- ─── wallet_transactions ────────────────────────────────────────────────────
CREATE POLICY "wtx_select_own"        ON public.wallet_transactions FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.wallet WHERE id = wallet_id)
);

-- ─── search_history ─────────────────────────────────────────────────────────
CREATE POLICY "search_manage_own"     ON public.search_history FOR ALL USING (auth.uid() = user_id);

-- ─── notification_preferences ───────────────────────────────────────────────
CREATE POLICY "notif_pref_manage_own" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- ─── safety_reports ─────────────────────────────────────────────────────────
CREATE POLICY "safety_select_own"     ON public.safety_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "safety_insert_own"     ON public.safety_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "safety_admin_all"      ON public.safety_reports FOR ALL USING (public.is_admin());

-- ─── audit_log ──────────────────────────────────────────────────────────────
CREATE POLICY "audit_select_admin"    ON public.audit_log FOR SELECT USING (public.is_admin());
-- INSERT solo via triggers SECURITY DEFINER

-- ─── tasker_earnings_summary ────────────────────────────────────────────────
CREATE POLICY "earn_select_own"       ON public.tasker_earnings_summary FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.tasker_profiles WHERE id = tasker_id)
);
CREATE POLICY "earn_admin_all"        ON public.tasker_earnings_summary FOR SELECT USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 6: FUNCIONES AUXILIARES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Trigger genérico: actualizar updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Crear perfil al registrar usuario (auth.users) ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'client'
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Wallet para todos los usuarios
  INSERT INTO public.wallet (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Preferencias de notificación por defecto
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Perfil extendido si es tasker
  IF v_role = 'tasker' THEN
    INSERT INTO public.tasker_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Calcular tier del tasker ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_tasker_tier(
  p_tasks_completed INT,
  p_avg_rating      NUMERIC
) RETURNS tasker_tier LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_tasks_completed >= 100 AND p_avg_rating >= 4.7 THEN
    RETURN 'platinum';
  ELSIF p_tasks_completed >= 30 AND p_avg_rating >= 4.3 THEN
    RETURN 'pro';
  ELSIF p_tasks_completed >= 5 AND p_avg_rating >= 3.5 THEN
    RETURN 'standard';
  ELSE
    RETURN 'new';
  END IF;
END;
$$;

-- ─── Actualizar métricas y tier del tasker al completar tarea ────────────────
CREATE OR REPLACE FUNCTION public.update_tasker_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tp_id      UUID;
  v_new_rating NUMERIC;
  v_new_count  INT;
  v_new_tier   tasker_tier;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT id INTO v_tp_id
    FROM public.tasker_profiles
    WHERE user_id = NEW.assigned_tasker_id;

    IF v_tp_id IS NOT NULL THEN
      SELECT
        COALESCE(AVG(rating), 0),
        COUNT(*)
      INTO v_new_rating, v_new_count
      FROM public.reviews
      WHERE reviewee_id = NEW.assigned_tasker_id;

      v_new_tier := public.calculate_tasker_tier(v_new_count, v_new_rating);

      UPDATE public.tasker_profiles
      SET
        total_tasks_completed = v_new_count,
        total_earnings        = total_earnings + COALESCE(NEW.agreed_price, 0),
        average_rating        = v_new_rating,
        tier                  = v_new_tier,
        updated_at            = NOW()
      WHERE id = v_tp_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Actualizar métricas del tasker cuando se recibe una review ──────────────
CREATE OR REPLACE FUNCTION public.update_tasker_rating_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tp_id      UUID;
  v_new_rating NUMERIC;
  v_new_count  INT;
  v_new_tier   tasker_tier;
BEGIN
  SELECT id INTO v_tp_id
  FROM public.tasker_profiles
  WHERE user_id = NEW.reviewee_id;

  IF v_tp_id IS NOT NULL THEN
    SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO v_new_rating, v_new_count
    FROM public.reviews
    WHERE reviewee_id = NEW.reviewee_id;

    v_new_tier := public.calculate_tasker_tier(v_new_count, v_new_rating);

    UPDATE public.tasker_profiles
    SET average_rating = v_new_rating,
        tier           = v_new_tier,
        updated_at     = NOW()
    WHERE id = v_tp_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Crear notificación (helper interno) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type    notification_type,
  p_title   TEXT,
  p_body    TEXT,
  p_data    JSONB DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END;
$$;

-- ─── Generar notificaciones al cambiar estado de una tarea ───────────────────
CREATE OR REPLACE FUNCTION public.notify_on_task_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'published' THEN
      -- Notificar a taskers verificados (enviado por sistema externo / Edge Function)
      NULL;

    WHEN 'confirmed' THEN
      PERFORM public.create_notification(
        NEW.client_id, 'task_accepted',
        '¡Tasker confirmado!',
        'Tu tarea ha sido confirmada. El tasker está en camino.',
        jsonb_build_object('task_id', NEW.id)
      );
      IF NEW.assigned_tasker_id IS NOT NULL THEN
        PERFORM public.create_notification(
          NEW.assigned_tasker_id, 'task_accepted',
          'Nueva tarea confirmada',
          'Has confirmado una nueva tarea. ¡Buena suerte!',
          jsonb_build_object('task_id', NEW.id)
        );
      END IF;

    WHEN 'in_progress' THEN
      PERFORM public.create_notification(
        NEW.client_id, 'task_started',
        'Tarea en progreso',
        'El tasker ha comenzado a trabajar en tu tarea.',
        jsonb_build_object('task_id', NEW.id)
      );

    WHEN 'pending_review' THEN
      PERFORM public.create_notification(
        NEW.client_id, 'task_completed',
        'Tarea lista para revisión',
        'El tasker indica que terminó. Por favor revisa el trabajo.',
        jsonb_build_object('task_id', NEW.id)
      );

    WHEN 'completed' THEN
      IF NEW.assigned_tasker_id IS NOT NULL THEN
        PERFORM public.create_notification(
          NEW.assigned_tasker_id, 'payment_released',
          '¡Pago liberado!',
          'El cliente aprobó la tarea. Tu pago está en camino.',
          jsonb_build_object('task_id', NEW.id)
        );
      END IF;

    WHEN 'cancelled' THEN
      PERFORM public.create_notification(
        NEW.client_id, 'task_cancelled',
        'Tarea cancelada',
        'Tu tarea ha sido cancelada.',
        jsonb_build_object('task_id', NEW.id, 'reason', NEW.cancellation_reason)
      );
      IF NEW.assigned_tasker_id IS NOT NULL THEN
        PERFORM public.create_notification(
          NEW.assigned_tasker_id, 'task_cancelled',
          'Tarea cancelada',
          'Una de tus tareas fue cancelada.',
          jsonb_build_object('task_id', NEW.id)
        );
      END IF;

    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- ─── Notificar al receptor de un mensaje nuevo ───────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conv        public.conversations%ROWTYPE;
  v_recipient   UUID;
  v_sender_name TEXT;
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;

  IF NEW.sender_id = v_conv.client_id THEN
    v_recipient := v_conv.tasker_id;
  ELSE
    v_recipient := v_conv.client_id;
  END IF;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  PERFORM public.create_notification(
    v_recipient, 'chat_message',
    'Nuevo mensaje de ' || v_sender_name,
    COALESCE(LEFT(NEW.content, 80), '📷 Imagen'),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'task_id',         v_conv.task_id,
      'job_id',          v_conv.job_id
    )
  );

  RETURN NEW;
END;
$$;

-- ─── Actualizar resumen de ganancias al liberarse un pago ────────────────────
CREATE OR REPLACE FUNCTION public.update_earnings_summary_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tp_id        UUID;
  v_week_start   DATE;
  v_month_start  DATE;
BEGIN
  -- Solo actuar cuando el pago cambia a 'released'
  IF NEW.status != 'released' OR OLD.status = 'released' THEN RETURN NEW; END IF;

  SELECT id INTO v_tp_id FROM public.tasker_profiles WHERE user_id = NEW.tasker_id;
  IF v_tp_id IS NULL THEN RETURN NEW; END IF;

  v_week_start  := date_trunc('week',  CURRENT_DATE)::DATE;
  v_month_start := date_trunc('month', CURRENT_DATE)::DATE;

  -- Resumen semanal
  INSERT INTO public.tasker_earnings_summary
    (tasker_id, period_type, period_start, period_end,
     subtotal_services, platform_fee_total, tips_total, net_payout, tasks_completed)
  VALUES
    (v_tp_id, 'weekly', v_week_start, v_week_start + 6,
     NEW.subtotal, NEW.platform_fee, NEW.tip_amount, NEW.tasker_payout, 1)
  ON CONFLICT (tasker_id, period_type, period_start) DO UPDATE SET
    subtotal_services  = tasker_earnings_summary.subtotal_services  + EXCLUDED.subtotal_services,
    platform_fee_total = tasker_earnings_summary.platform_fee_total + EXCLUDED.platform_fee_total,
    tips_total         = tasker_earnings_summary.tips_total         + EXCLUDED.tips_total,
    net_payout         = tasker_earnings_summary.net_payout         + EXCLUDED.net_payout,
    tasks_completed    = tasker_earnings_summary.tasks_completed    + 1;

  -- Resumen mensual
  INSERT INTO public.tasker_earnings_summary
    (tasker_id, period_type, period_start, period_end,
     subtotal_services, platform_fee_total, tips_total, net_payout, tasks_completed)
  VALUES
    (v_tp_id, 'monthly', v_month_start, (v_month_start + INTERVAL '1 month - 1 day')::DATE,
     NEW.subtotal, NEW.platform_fee, NEW.tip_amount, NEW.tasker_payout, 1)
  ON CONFLICT (tasker_id, period_type, period_start) DO UPDATE SET
    subtotal_services  = tasker_earnings_summary.subtotal_services  + EXCLUDED.subtotal_services,
    platform_fee_total = tasker_earnings_summary.platform_fee_total + EXCLUDED.platform_fee_total,
    tips_total         = tasker_earnings_summary.tips_total         + EXCLUDED.tips_total,
    net_payout         = tasker_earnings_summary.net_payout         + EXCLUDED.net_payout,
    tasks_completed    = tasker_earnings_summary.tasks_completed    + 1;

  -- Registrar en wallet_transactions del tasker
  INSERT INTO public.wallet_transactions (wallet_id, amount, description, reference_type, reference_id)
  SELECT w.id, NEW.tasker_payout,
         'Pago liberado por tarea completada',
         'task_payment', NEW.task_id
  FROM public.wallet w WHERE w.user_id = NEW.tasker_id;

  RETURN NEW;
END;
$$;

-- ─── Generar código de referido ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_code TEXT;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ─── Búsqueda geoespacial de taskers cercanos ────────────────────────────────
-- Uso: SELECT * FROM find_nearby_taskers(-2.1894, -79.8890, 10, 'subcategory-uuid');
CREATE OR REPLACE FUNCTION public.find_nearby_taskers(
  p_lat          DOUBLE PRECISION,
  p_lng          DOUBLE PRECISION,
  p_radius_km    NUMERIC DEFAULT 10,
  p_subcategory  UUID   DEFAULT NULL
)
RETURNS TABLE (
  user_id              UUID,
  full_name            TEXT,
  avatar_url           TEXT,
  tasker_profile_id    UUID,
  tier                 tasker_tier,
  average_rating       NUMERIC,
  total_tasks_completed INT,
  base_hourly_rate     NUMERIC,
  accepts_emergency    BOOLEAN,
  distance_km          NUMERIC,
  skills               TEXT[]
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    tp.id,
    tp.tier,
    tp.average_rating,
    tp.total_tasks_completed,
    tp.base_hourly_rate,
    tp.accepts_emergency,
    ROUND(
      ST_Distance(
        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000, 2
    )::NUMERIC AS distance_km,
    ARRAY_AGG(DISTINCT sc.name)
  FROM public.profiles p
  JOIN public.tasker_profiles tp ON tp.user_id = p.id
  LEFT JOIN public.tasker_skills ts ON ts.tasker_id = tp.id
  LEFT JOIN public.subcategories sc ON sc.id = ts.subcategory_id
  WHERE
    p.is_active = TRUE
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND tp.verification_status = 'verified'
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    AND (p_subcategory IS NULL OR ts.subcategory_id = p_subcategory)
  GROUP BY p.id, p.full_name, p.avatar_url, tp.id, tp.tier,
           tp.average_rating, tp.total_tasks_completed,
           tp.base_hourly_rate, tp.accepts_emergency, p.latitude, p.longitude
  ORDER BY distance_km ASC, tp.average_rating DESC;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 7: TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- updated_at en tablas que lo necesitan
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.happiness_pledge_claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.availability_blocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Actualizar métricas del tasker al completar tarea
CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_tasker_metrics();

-- Actualizar rating del tasker al recibir review
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_tasker_rating_on_review();

-- Notificaciones por cambio de estado de tarea
CREATE TRIGGER on_task_status_change
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_task_status_change();

-- Notificación por nuevo mensaje
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- Actualizar resumen de ganancias al liberar pago
CREATE TRIGGER on_payment_released
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_earnings_summary_on_payment();


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 8: VISTAS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Vista de compatibilidad para app React Native (usa 'target_id') ─────────
-- IMPORTANTE: Actualizar la app React Native para usar 'reviewee_id' directamente.
CREATE OR REPLACE VIEW public.v_reviews_compat AS
SELECT
  r.*,
  r.reviewee_id AS target_id   -- alias temporal para app React Native
FROM public.reviews r;

COMMENT ON VIEW public.v_reviews_compat IS
  'Vista de compatibilidad. La app React Native usa target_id; migrar a reviews.reviewee_id.';

-- ─── Taskers disponibles con habilidades ─────────────────────────────────────
CREATE OR REPLACE VIEW public.v_available_taskers AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.avatar_url,
  p.city,
  p.latitude,
  p.longitude,
  tp.id AS tasker_profile_id,
  tp.tier,
  tp.average_rating,
  tp.total_tasks_completed,
  tp.base_hourly_rate,
  tp.service_radius_km,
  tp.verification_status,
  tp.accepts_emergency,
  ARRAY_AGG(DISTINCT sc.name)  AS skills,
  ARRAY_AGG(DISTINCT c.name)   AS categories
FROM public.profiles p
JOIN public.tasker_profiles tp ON tp.user_id = p.id
LEFT JOIN public.tasker_skills ts ON ts.tasker_id = tp.id
LEFT JOIN public.subcategories sc ON sc.id = ts.subcategory_id
LEFT JOIN public.categories c ON c.id = sc.category_id
WHERE p.is_active = TRUE
  AND p.is_online = TRUE
  AND tp.verification_status = 'verified'
GROUP BY p.id, p.full_name, p.avatar_url, p.city, p.latitude, p.longitude,
         tp.id, tp.tier, tp.average_rating, tp.total_tasks_completed,
         tp.base_hourly_rate, tp.service_radius_km, tp.verification_status,
         tp.accepts_emergency;

-- ─── Dashboard admin de tareas ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_admin_task_dashboard AS
SELECT
  t.id,
  t.title,
  t.status,
  t.created_at,
  t.agreed_price,
  t.total_price,
  t.is_emergency,
  t.city,
  c.name  AS category,
  sc.name AS subcategory,
  client.full_name  AS client_name,
  client.email      AS client_email,
  tasker.full_name  AS tasker_name,
  pay.status        AS payment_status,
  pay.total_amount  AS payment_amount
FROM public.tasks t
JOIN  public.categories   c      ON c.id  = t.category_id
JOIN  public.subcategories sc    ON sc.id = t.subcategory_id
JOIN  public.profiles client     ON client.id = t.client_id
LEFT JOIN public.profiles tasker ON tasker.id = t.assigned_tasker_id
LEFT JOIN public.payments pay    ON pay.task_id = t.id
ORDER BY t.created_at DESC;

-- ─── Dashboard admin de jobs (React Native) ──────────────────────────────────
CREATE OR REPLACE VIEW public.v_admin_job_dashboard AS
SELECT
  j.id,
  j.category,
  j.subcategory,
  j.status,
  j.price_min,
  j.price_max,
  j.location_label,
  j.created_at,
  client.full_name AS client_name,
  client.email     AS client_email,
  COUNT(pr.id)     AS proposal_count
FROM public.jobs j
JOIN  public.profiles client ON client.id = j.client_id
LEFT JOIN public.proposals pr ON pr.job_id = j.id
GROUP BY j.id, j.category, j.subcategory, j.status, j.price_min, j.price_max,
         j.location_label, j.created_at, client.full_name, client.email
ORDER BY j.created_at DESC;

-- ─── Perfil completo del tasker (para pantalla "Mi Negocio") ────────────────
CREATE OR REPLACE VIEW public.v_tasker_full_profile AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.email,
  p.phone,
  p.avatar_url,
  p.city,
  p.is_online,
  p.last_seen_at,
  tp.id AS tasker_profile_id,
  tp.verification_status,
  tp.bio,
  tp.years_experience,
  tp.service_radius_km,
  tp.base_hourly_rate,
  tp.has_own_tools,
  tp.has_vehicle,
  tp.tier,
  tp.total_tasks_completed,
  tp.total_earnings,
  tp.average_rating,
  tp.response_rate,
  tp.acceptance_rate,
  tp.punctuality_rate,
  tp.accepts_emergency,
  tp.min_task_price,
  COALESCE(w.balance, 0) AS wallet_balance
FROM public.profiles p
JOIN public.tasker_profiles tp ON tp.user_id = p.id
LEFT JOIN public.wallet w ON w.user_id = p.id
WHERE p.role = 'tasker';

-- ─── Historial de tareas del cliente ────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_client_task_history AS
SELECT
  t.id,
  t.title,
  t.status,
  t.agreed_price,
  t.total_price,
  t.created_at,
  t.completed_at,
  t.cancelled_at,
  c.name  AS category,
  sc.name AS subcategory,
  t.address_line,
  t.city,
  tasker.full_name AS tasker_name,
  tasker.avatar_url AS tasker_avatar,
  tp.average_rating AS tasker_rating,
  tp.tier AS tasker_tier,
  r.rating AS my_rating,
  r.comment AS my_review
FROM public.tasks t
JOIN public.categories c    ON c.id  = t.category_id
JOIN public.subcategories sc ON sc.id = t.subcategory_id
LEFT JOIN public.profiles tasker ON tasker.id = t.assigned_tasker_id
LEFT JOIN public.tasker_profiles tp ON tp.user_id = t.assigned_tasker_id
LEFT JOIN public.reviews r ON r.task_id = t.id AND r.reviewer_id = t.client_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 9: REALTIME
-- ═══════════════════════════════════════════════════════════════════════════
-- Activar publicaciones Realtime para las tablas que las apps escuchan.
-- Ejecutar en el SQL Editor de Supabase:

BEGIN;
  -- Publicación para mensajes de chat (app Flutter escucha con .stream())
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

  -- Publicación para cambios de estado de tareas
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

  -- Publicación para nuevas propuestas (app React Native escucha con .channel())
  ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;

  -- Publicación para notificaciones in-app
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

  -- Publicación para postulaciones (app Flutter)
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;
COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 10: STORAGE BUCKETS — POLÍTICAS RLS
-- ═══════════════════════════════════════════════════════════════════════════
-- Crear los buckets manualmente en Supabase Dashboard > Storage, luego
-- ejecutar las siguientes políticas de acceso.
--
-- Buckets a crear:
--   'avatars'            → público
--   'verification-docs'  → privado
--   'task-photos'        → público
--   'chat-images'        → restringido a participantes
--   'dispute-evidence'   → privado
--   'claim-evidence'     → privado
--   'safety-evidence'    → privado

-- Avatars: cualquiera puede leer, solo el dueño puede subir
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fotos de tareas: público para lectura, solo participantes suben
CREATE POLICY "task_photos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');

CREATE POLICY "task_photos_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

-- Imágenes del chat: solo usuarios autenticados
CREATE POLICY "chat_images_auth"
  ON storage.objects FOR ALL
  USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- Documentos de verificación: solo el dueño y admins
CREATE POLICY "vdocs_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "vdocs_select_own_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

-- Evidencia de disputas, claims y seguridad: solo admins y el dueño
CREATE POLICY "evidence_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('dispute-evidence', 'claim-evidence', 'safety-evidence')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "evidence_select_own_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('dispute-evidence', 'claim-evidence', 'safety-evidence')
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- SECCIÓN 11: NOTAS DE MIGRACIÓN Y DISCREPANCIAS
-- ═══════════════════════════════════════════════════════════════════════════

/*
DISCREPANCIAS IDENTIFICADAS ENTRE LAS APPS Y EL SCHEMA:

1. [CRÍTICO] App React Native usa tabla 'jobs' + 'proposals'
   - La app ESCRIBE en 'jobs' y escucha 'proposals' via Realtime.
   - El schema v1 solo tenía 'tasks' y 'task_applications' (app Flutter).
   - SOLUCIÓN: Se crearon ambas tablas. jobs.task_id vincula a tasks cuando
     se formaliza el servicio. Un job puede evolucionar a un task completo.

2. [CRÍTICO] App React Native usa reviews.target_id
   - El schema usa reviews.reviewee_id (semánticamente correcto).
   - SOLUCIÓN: Vista v_reviews_compat expone target_id como alias.
   - ACCIÓN REQUERIDA: Actualizar la query en index.tsx (línea 96):
       .eq('target_id', ...)  →  .eq('reviewee_id', ...)

3. [MENOR] App React Native usa auth.user_metadata.full_name para el nombre
   - El trigger handle_new_user ya extrae este campo. ✓

4. [MENOR] Realtime channel para proposals: 'job_proposals_{jobId}'
   - El schema habilita Realtime en la tabla proposals. ✓
   - El filtro job_id=eq.{jobId} funcionará correctamente.

FLUJO UNIFICADO RECOMENDADO:
  Cliente crea job (React Native) → Taskers ven job y envían proposals
  → Cliente acepta proposal → Se crea task formal + conversation
  → Tasker completa task (Flutter) → Payment released → Reviews
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL SCHEMA UNIFICADO
-- ═══════════════════════════════════════════════════════════════════════════
