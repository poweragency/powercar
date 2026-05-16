-- ============================================================
-- Notifications: notifiche in-app multi-tenant
-- ============================================================

do $$ begin
  create type notification_type as enum (
    'new_lead',
    'appointment_soon',
    'case_status_change',
    'invoice_paid',
    'system'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_owner_unread_idx
  on public.notifications(owner_id, read, created_at desc);
create index if not exists notifications_owner_created_idx
  on public.notifications(owner_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (owner_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (owner_id = auth.uid());

-- Trigger: nuovo lead → notifica per l'owner
create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.notifications (owner_id, type, title, body, link)
    values (
      new.owner_id,
      'new_lead',
      'Nuovo lead: ' || new.full_name,
      coalesce(
        nullif(new.phone, '') || coalesce(' · ' || nullif(new.email, ''), ''),
        new.email,
        'Nessun contatto'
      ),
      '/leads'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_lead on public.leads;
create trigger trg_notify_new_lead
  after insert on public.leads
  for each row
  execute function public.notify_new_lead();
