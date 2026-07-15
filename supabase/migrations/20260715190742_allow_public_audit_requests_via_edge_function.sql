alter table public.audit_requests alter column user_id drop not null;

alter table public.audit_requests
  add column if not exists source text not null default 'website';

alter table public.audit_requests
  add column if not exists contact_name text;

create index if not exists audit_requests_created_at_idx
  on public.audit_requests (created_at desc);

create index if not exists audit_requests_email_idx
  on public.audit_requests (lower(email));

create index if not exists audit_requests_email_business_created_idx
  on public.audit_requests (lower(email), lower(business_name), created_at desc);

alter table public.audit_requests
  drop constraint if exists audit_requests_status_check;

alter table public.audit_requests
  add constraint audit_requests_status_check
  check (status in ('pending', 'contacted', 'scheduled', 'completed', 'closed'));

alter table public.audit_requests
  drop constraint if exists audit_requests_email_length_check;

alter table public.audit_requests
  add constraint audit_requests_email_length_check
  check (char_length(email) between 3 and 320);

alter table public.audit_requests
  drop constraint if exists audit_requests_business_name_length_check;

alter table public.audit_requests
  add constraint audit_requests_business_name_length_check
  check (char_length(business_name) between 2 and 160);

comment on column public.audit_requests.user_id is
  'Authenticated requester when submitted from the portal; null for validated public website submissions handled by an Edge Function.';
