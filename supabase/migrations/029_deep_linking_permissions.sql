-- Ensure the view used for fetching deep linked machines is accessible
-- We keep authenticated and anon for basic deep linking, but rely on the 'status' filter 
-- in the application code and machines table RLS for security.
GRANT SELECT ON machines_with_details TO authenticated, anon;

