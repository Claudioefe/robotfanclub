-- Admin (Phase 7): API spend per client and day, for the staff Costs screen.
-- aio_checks.cost_usd is a staff-only column (users cannot read it), so this view is readable only by the server
-- (secret key). Users and anon get nothing.
create view public.cost_by_client_day with (security_invoker = true) as
select client_id,
       checked_on as day,
       count(*) as checks,
       coalesce(sum(cost_usd), 0) as cost_usd
from public.aio_checks
group by client_id, checked_on;

grant select on public.cost_by_client_day to service_role;
