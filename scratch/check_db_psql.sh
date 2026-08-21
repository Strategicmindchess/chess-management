#!/bin/sh
# Check leaderboard data using raw psql
psql "$DATABASE_URL" -c "
SELECT 'CALC LOGS' as section, period_type, status, started_at::text, students_processed 
FROM leaderboard_calculation_log 
ORDER BY started_at DESC LIMIT 5;

SELECT 'LEADERBOARD ENTRIES' as section, u.name, le.total_score, le.period_type, le.updated_at::text
FROM leaderboard_entry le
JOIN student_profile sp ON le.student_profile_id = sp.id
JOIN \"User\" u ON sp.user_id = u.id
ORDER BY le.updated_at DESC LIMIT 10;

SELECT 'CHESS SNAPSHOTS' as section, u.name, cds.platform, cds.fetched_at::text
FROM chess_data_snapshot cds
JOIN student_profile sp ON cds.student_profile_id = sp.id
JOIN \"User\" u ON sp.user_id = u.id
ORDER BY cds.fetched_at DESC LIMIT 5;
" 2>&1
