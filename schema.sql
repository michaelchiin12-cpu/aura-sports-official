-- ============================================================
-- AURA SPORT MANAGER — Skema Supabase
-- Jalankan seluruh file ini di: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- Tabel tunggal yang menyimpan seluruh state aplikasi sebagai JSON,
-- dibagikan oleh semua pengguna yang membuka halaman yang sama.
create table if not exists public.sport_manager_state (
    id smallint primary key default 1,
    players jsonb not null default '[]'::jsonb,
    matches_history jsonb not null default '[]'::jsonb,
    active_matches jsonb not null default '[]'::jsonb,
    finance_transactions jsonb not null default '[]'::jsonb,
    finance_settings jsonb not null default '{"payPerPlay": 0}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint single_row check (id = 1)
);

-- Baris awal (wajib ada, karena aplikasi selalu membaca/mengubah id = 1)
insert into public.sport_manager_state (id)
values (1)
on conflict (id) do nothing;

-- Aktifkan Row Level Security
alter table public.sport_manager_state enable row level security;

-- Tool ini tidak pakai login/akun (sama seperti versi localStorage sebelumnya) —
-- siapa pun yang punya link bisa baca & tulis. Ini setara dengan whiteboard
-- bersama untuk komunitas, bukan sistem dengan data sensitif per-user.
create policy "Semua orang bisa baca state"
    on public.sport_manager_state
    for select
    to anon
    using (true);

create policy "Semua orang bisa update state"
    on public.sport_manager_state
    for update
    to anon
    using (true)
    with check (true);

-- Aktifkan Realtime untuk tabel ini supaya perubahan langsung ter-broadcast
-- ke semua client yang sedang membuka halaman.
alter publication supabase_realtime add table public.sport_manager_state;
