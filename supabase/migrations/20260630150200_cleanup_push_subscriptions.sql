-- Clean up stale push subscriptions to free storage and reduce push failures.

-- Remove subscriptions not seen in 90 days
DELETE FROM push_subscriptions
WHERE last_seen_at < NOW() - INTERVAL '90 days'
  AND is_active = true;

-- Deactivate subscriptions from soft-deleted students
UPDATE push_subscriptions ps
SET is_active = false
WHERE ps.student_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = ps.student_id AND s.deleted_at IS NOT NULL
  );
