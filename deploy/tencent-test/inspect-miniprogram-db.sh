#!/bin/sh
set -eu

cd /opt/zhaoshang-test

sudo -n docker compose exec -T db sh -c 'exec psql -X -q -P pager=off -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT current_database() AS database,
       current_setting('transaction_read_only') AS read_only,
       CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS checked_at_utc;

SELECT status, count(*) AS projects
  FROM projects
 GROUP BY status
 ORDER BY status;

SELECT (SELECT count(*) FROM projects) AS projects,
       (SELECT count(*) FROM leads) AS leads,
       (SELECT count(*) FROM media) AS media,
       (SELECT count(*) FROM favorites) AS favorites;

SELECT count(*) AS online_projects,
       count(m.id) AS linked_covers,
       count(*) FILTER (WHERE m.source = 'lead_attachment') AS consultation_covers,
       count(*) FILTER (WHERE p.area_min > 0 AND p.area_max >= p.area_min) AS area_ranges,
       count(*) FILTER (WHERE p.monthly_rent_min >= 0 AND p.monthly_rent_max >= p.monthly_rent_min) AS rent_ranges,
       count(*) FILTER (WHERE NULLIF(trim(p.fee_text), '') IS NOT NULL) AS fee_descriptions
  FROM projects p
  LEFT JOIN media m ON m.id = p.cover_image_id
 WHERE p.status = 'online';

SELECT count(l.project_id) AS leads_with_project,
       count(*) FILTER (WHERE l.project_id IS NOT NULL AND p.id IS NULL) AS missing_project_links
  FROM leads l
  LEFT JOIN projects p ON p.id = l.project_id;

COMMIT;
SQL
