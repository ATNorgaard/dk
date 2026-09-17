-- A client reading a live profile also needs the specialist's name and
-- email from people (the full CV shows contact details). Until now only
-- the person themselves and board/admin could read a people row, so the
-- profile page's embed came back empty for clients.

create policy "clients read live specialists" on public.people
  for select to authenticated
  using (
    public.has_role('client')
    and exists (
      select 1 from public.specialist_profiles p
      where p.person_id = people.id and public.profile_is_live(p.id)
    )
  );
