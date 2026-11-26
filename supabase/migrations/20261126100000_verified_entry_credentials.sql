begin;

create table public.entry_credentials (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id) on delete set null
);

alter table public.entry_credentials enable row level security;
revoke all on table public.entry_credentials from public, anon, authenticated;
grant select, insert on table public.entry_credentials to service_role;

create or replace function public.issue_entry_credential(
  p_ticket_id uuid,
  p_token_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets%rowtype;
  v_stored_hash text;
begin
  if p_ticket_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid credential issuance request';
  end if;

  select t.* into v_ticket
    from public.tickets t
    where t.id = p_ticket_id
    for update;
  if not found or v_ticket.payment_mode <> 'zcash-testnet' or v_ticket.payment_status <> 'confirmed' then
    raise exception 'Only a confirmed Zcash testnet ticket can receive an entry credential';
  end if;

  insert into public.entry_credentials (ticket_id, event_id, token_hash)
  values (v_ticket.id, v_ticket.event_id, p_token_hash)
  on conflict (ticket_id) do nothing;

  select c.token_hash into v_stored_hash
    from public.entry_credentials c
    where c.ticket_id = v_ticket.id;
  if v_stored_hash <> p_token_hash then
    raise exception 'Entry credential already exists with a different token';
  end if;

  return 'issued';
end;
$$;

revoke all on function public.issue_entry_credential(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_entry_credential(uuid, text) to service_role;

create or replace function public.check_in_entry_credential(
  p_event_id bigint,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_ticket_id uuid;
  v_ticket_reference text;
  v_attendee_name text;
  v_quantity smallint;
  v_ticket_status text;
  v_checked_in_at timestamptz;
  v_event_title text;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;
  if p_event_id is null or p_event_id <= 0 or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state', 'invalid');
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.organizer_id = v_actor
  ) then
    raise exception 'Organizer cannot check in this event';
  end if;

  select c.ticket_id, t.ticket_reference, t.attendee_name, t.quantity, t.status,
         c.checked_in_at, e.title
    into v_ticket_id, v_ticket_reference, v_attendee_name, v_quantity,
         v_ticket_status, v_checked_in_at, v_event_title
    from public.entry_credentials c
    join public.tickets t on t.id = c.ticket_id
    join public.events e on e.id = c.event_id
    where c.event_id = p_event_id and c.token_hash = p_token_hash
    for update of c, t;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;
  if v_checked_in_at is not null or v_ticket_status in ('Checked in', 'Checked out') then
    return jsonb_build_object(
      'state', 'already_used',
      'ticketReference', v_ticket_reference,
      'attendeeName', v_attendee_name,
      'quantity', v_quantity,
      'eventTitle', v_event_title,
      'checkedInAt', v_checked_in_at
    );
  end if;
  if v_ticket_status <> 'Active' then
    return jsonb_build_object('state', 'invalid');
  end if;

  update public.entry_credentials c
    set checked_in_at = now(), checked_in_by = v_actor
    where c.ticket_id = v_ticket_id and c.checked_in_at is null;
  if not found then
    return jsonb_build_object('state', 'already_used');
  end if;

  update public.tickets t
    set status = 'Checked in'
    where t.id = v_ticket_id and t.status = 'Active';
  if not found then
    raise exception 'Ticket status changed during check-in';
  end if;

  return jsonb_build_object(
    'state', 'valid',
    'ticketReference', v_ticket_reference,
    'attendeeName', v_attendee_name,
    'quantity', v_quantity,
    'eventTitle', v_event_title,
    'checkedInAt', now()
  );
end;
$$;

revoke all on function public.check_in_entry_credential(bigint, text) from public, anon;
grant execute on function public.check_in_entry_credential(bigint, text) to authenticated;

commit;
