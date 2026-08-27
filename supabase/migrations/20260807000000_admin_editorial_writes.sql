-- Atomic Admin writes for nested editorial content. NestJS validates the
-- payload and calls these functions with the service-role client. Keeping the
-- parent and child writes in one PostgreSQL transaction prevents partial saves.

create or replace function public.admin_save_move(
  p_move_id uuid,
  p_created_by uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_move_id uuid := coalesce(p_move_id, gen_random_uuid());
  v_step jsonb;
  v_clip jsonb;
  v_value text;
  v_order integer;
begin
  if p_move_id is null then
    insert into public.moves (
      id, category_id, slug, name, summary, difficulty, how_to_use,
      when_to_use, coaching_cues, common_mistakes, cover_asset_id,
      status, published_at, created_by
    ) values (
      v_move_id,
      (p_payload->>'categoryId')::uuid,
      p_payload->>'slug',
      p_payload->>'name',
      coalesce(p_payload->>'summary', ''),
      (p_payload->>'difficulty')::public.move_difficulty,
      coalesce(p_payload->>'howToUse', ''),
      coalesce(p_payload->>'whenToUse', ''),
      coalesce(array(select jsonb_array_elements_text(p_payload->'coachingCues')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_payload->'commonMistakes')), '{}'),
      nullif(p_payload->>'coverAssetId', '')::uuid,
      (p_payload->>'status')::public.content_status,
      case when p_payload->>'status' = 'published' then now() else null end,
      p_created_by
    );
  else
    update public.moves set
      category_id = (p_payload->>'categoryId')::uuid,
      slug = p_payload->>'slug',
      name = p_payload->>'name',
      summary = coalesce(p_payload->>'summary', ''),
      difficulty = (p_payload->>'difficulty')::public.move_difficulty,
      how_to_use = coalesce(p_payload->>'howToUse', ''),
      when_to_use = coalesce(p_payload->>'whenToUse', ''),
      coaching_cues = coalesce(array(select jsonb_array_elements_text(p_payload->'coachingCues')), '{}'),
      common_mistakes = coalesce(array(select jsonb_array_elements_text(p_payload->'commonMistakes')), '{}'),
      cover_asset_id = nullif(p_payload->>'coverAssetId', '')::uuid,
      status = (p_payload->>'status')::public.content_status,
      published_at = case
        when p_payload->>'status' = 'published' then coalesce(published_at, now())
        else null
      end
    where id = v_move_id;

    if not found then
      raise exception 'Move % not found', v_move_id using errcode = 'P0002';
    end if;
  end if;

  delete from public.move_steps where move_id = v_move_id;
  delete from public.highlight_clips where move_id = v_move_id;
  delete from public.move_players where move_id = v_move_id;
  delete from public.move_tags where move_id = v_move_id;

  v_order := 0;
  for v_value in select jsonb_array_elements_text(coalesce(p_payload->'playerIds', '[]'))
  loop
    insert into public.move_players (move_id, player_id, relation, sort_order)
    values (v_move_id, v_value::uuid, 'demonstrated_by', v_order);
    v_order := v_order + 1;
  end loop;

  for v_value in select jsonb_array_elements_text(coalesce(p_payload->'tagIds', '[]'))
  loop
    insert into public.move_tags (move_id, tag_id)
    values (v_move_id, v_value::uuid);
  end loop;

  v_order := 0;
  for v_clip in select value from jsonb_array_elements(coalesce(p_payload->'clips', '[]'))
  loop
    insert into public.highlight_clips (
      id, move_id, player_id, media_asset_id, title, start_ms, end_ms,
      cover_time_ms, sort_order
    ) values (
      coalesce(nullif(v_clip->>'id', '')::uuid, gen_random_uuid()),
      v_move_id,
      nullif(v_clip->>'playerId', '')::uuid,
      (v_clip->>'mediaAssetId')::uuid,
      v_clip->>'title',
      (v_clip->>'startMs')::integer,
      (v_clip->>'endMs')::integer,
      nullif(v_clip->>'coverTimeMs', '')::integer,
      v_order
    );
    v_order := v_order + 1;
  end loop;

  v_order := 0;
  for v_step in select value from jsonb_array_elements(coalesce(p_payload->'steps', '[]'))
  loop
    insert into public.move_steps (
      id, move_id, title, description, sort_order
    ) values (
      coalesce(nullif(v_step->>'id', '')::uuid, gen_random_uuid()),
      v_move_id,
      v_step->>'title',
      coalesce(v_step->>'description', ''),
      v_order
    );
    v_order := v_order + 1;
  end loop;

  return v_move_id;
end;
$$;

create or replace function public.admin_save_workout_template(
  p_template_id uuid,
  p_created_by uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_template_id uuid := coalesce(p_template_id, gen_random_uuid());
  v_section_id uuid;
  v_section jsonb;
  v_item jsonb;
  v_section_order integer := 0;
  v_item_order integer;
begin
  if p_template_id is null then
    insert into public.workout_templates (
      id, source_player_id, slug, name, description, warmup_notes,
      difficulty, estimated_duration_minutes, cover_asset_id, status,
      published_at, created_by
    ) values (
      v_template_id,
      nullif(p_payload->>'sourcePlayerId', '')::uuid,
      p_payload->>'slug',
      p_payload->>'name',
      coalesce(p_payload->>'description', ''),
      coalesce(p_payload->>'warmupNotes', ''),
      (p_payload->>'difficulty')::public.move_difficulty,
      nullif(p_payload->>'estimatedDurationMinutes', '')::integer,
      nullif(p_payload->>'coverAssetId', '')::uuid,
      (p_payload->>'status')::public.content_status,
      case when p_payload->>'status' = 'published' then now() else null end,
      p_created_by
    );
  else
    update public.workout_templates set
      source_player_id = nullif(p_payload->>'sourcePlayerId', '')::uuid,
      slug = p_payload->>'slug',
      name = p_payload->>'name',
      description = coalesce(p_payload->>'description', ''),
      warmup_notes = coalesce(p_payload->>'warmupNotes', ''),
      difficulty = (p_payload->>'difficulty')::public.move_difficulty,
      estimated_duration_minutes = nullif(p_payload->>'estimatedDurationMinutes', '')::integer,
      cover_asset_id = nullif(p_payload->>'coverAssetId', '')::uuid,
      status = (p_payload->>'status')::public.content_status,
      published_at = case
        when p_payload->>'status' = 'published' then coalesce(published_at, now())
        else null
      end
    where id = v_template_id;

    if not found then
      raise exception 'Workout template % not found', v_template_id using errcode = 'P0002';
    end if;
  end if;

  delete from public.workout_template_sections where template_id = v_template_id;

  for v_section in select value from jsonb_array_elements(coalesce(p_payload->'sections', '[]'))
  loop
    v_section_id := coalesce(nullif(v_section->>'id', '')::uuid, gen_random_uuid());
    insert into public.workout_template_sections (
      id, template_id, name, description, sort_order
    ) values (
      v_section_id,
      v_template_id,
      v_section->>'name',
      coalesce(v_section->>'description', ''),
      v_section_order
    );

    v_item_order := 0;
    for v_item in select value from jsonb_array_elements(coalesce(v_section->'items', '[]'))
    loop
      insert into public.workout_template_items (
        id, section_id, move_id, title, instructions, sets, reps,
        duration_seconds, rest_seconds, sort_order
      ) values (
        coalesce(nullif(v_item->>'id', '')::uuid, gen_random_uuid()),
        v_section_id,
        nullif(v_item->>'moveId', '')::uuid,
        v_item->>'title',
        coalesce(v_item->>'instructions', ''),
        nullif(v_item->>'sets', '')::integer,
        nullif(v_item->>'reps', '')::integer,
        nullif(v_item->>'durationSeconds', '')::integer,
        coalesce(nullif(v_item->>'restSeconds', '')::integer, 0),
        v_item_order
      );
      v_item_order := v_item_order + 1;
    end loop;
    v_section_order := v_section_order + 1;
  end loop;

  return v_template_id;
end;
$$;

revoke all on function public.admin_save_move(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_save_workout_template(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_move(uuid, uuid, jsonb) to service_role;
grant execute on function public.admin_save_workout_template(uuid, uuid, jsonb) to service_role;
