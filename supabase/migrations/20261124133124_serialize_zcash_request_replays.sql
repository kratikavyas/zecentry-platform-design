begin;

create or replace function public.purchase_zcash_testnet_ticket(
  p_event_id bigint,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_id uuid,
  p_quantity integer,
  p_request_key uuid,
  p_ticket_price integer,
  p_payment_txid text,
  p_payment_amount_zat bigint
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_event_price integer;
  v_sold integer;
  v_capacity integer;
  v_ticket public.tickets;
  v_txid text := lower(coalesce(p_payment_txid, ''));
begin
  if p_attendee_id is null or p_request_key is null then
    raise exception 'Payment identity required';
  end if;
  if char_length(btrim(coalesce(p_attendee_name, ''))) not between 1 and 120 then
    raise exception 'Attendee name must be between 1 and 120 characters';
  end if;
  if char_length(btrim(coalesce(p_attendee_email, ''))) not between 3 and 320 then
    raise exception 'Verified account email required';
  end if;
  if p_quantity is null or p_quantity not between 1 and 6 then
    raise exception 'Quantity must be between 1 and 6';
  end if;
  if p_ticket_price is null or p_ticket_price < 0 then
    raise exception 'Invalid ticket price';
  end if;
  if v_txid !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid Zcash transaction id';
  end if;
  if p_payment_amount_zat is null or p_payment_amount_zat <= 0 or p_payment_amount_zat > 2100000000000000 then
    raise exception 'Invalid Zcash payment amount';
  end if;

  select u.email, u.email_confirmed_at
    into v_user_email, v_email_confirmed_at
    from auth.users u
    where u.id = p_attendee_id
    for key share;
  if not found or v_email_confirmed_at is null or lower(v_user_email) <> lower(btrim(p_attendee_email)) then
    raise exception 'Payment attendee does not match a verified account';
  end if;

  -- Serialize retries for the same account/request before checking whether a
  -- prior transaction already created its ticket.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_attendee_id::text || ':' || p_request_key::text, 0)
  );

  select t.* into v_ticket
    from public.tickets t
    where t.attendee_id = p_attendee_id
      and t.request_key = p_request_key;
  if found then
    if v_ticket.payment_mode <> 'zcash-testnet'
      or v_ticket.payment_txid <> v_txid
      or v_ticket.payment_amount_zat <> p_payment_amount_zat
      or v_ticket.event_id <> p_event_id
      or v_ticket.quantity <> p_quantity
      or v_ticket.attendee_name <> btrim(p_attendee_name)
      or v_ticket.attendee_email <> lower(btrim(p_attendee_email))
      or v_ticket.total_amount <> p_ticket_price::bigint * p_quantity then
      raise exception 'Payment request was already used';
    end if;
    return v_ticket;
  end if;

  select e.price, e.sold, e.capacity
    into v_event_price, v_sold, v_capacity
    from public.events e
    where e.id = p_event_id
    for update;
  if not found then
    raise exception 'Event unavailable';
  end if;
  if v_event_price <> p_ticket_price then
    raise exception 'Event price changed; create a new payment request';
  end if;
  if v_sold < 0 or v_sold + p_quantity > v_capacity then
    raise exception 'Not enough tickets available';
  end if;

  insert into public.tickets (
    event_id, attendee_id, attendee_name, attendee_email, quantity,
    total_amount, request_key, payment_status, payment_mode,
    payment_txid, payment_amount_zat
  ) values (
    p_event_id, p_attendee_id, btrim(p_attendee_name), lower(btrim(p_attendee_email)), p_quantity,
    v_event_price::bigint * p_quantity, p_request_key, 'confirmed', 'zcash-testnet',
    v_txid, p_payment_amount_zat
  ) returning * into v_ticket;

  update public.events e
    set sold = e.sold + p_quantity
    where e.id = p_event_id;

  return v_ticket;
end;
$$;

revoke all on function public.purchase_zcash_testnet_ticket(bigint, text, text, uuid, integer, uuid, integer, text, bigint) from public, anon, authenticated;
grant execute on function public.purchase_zcash_testnet_ticket(bigint, text, text, uuid, integer, uuid, integer, text, bigint) to service_role;

commit;
