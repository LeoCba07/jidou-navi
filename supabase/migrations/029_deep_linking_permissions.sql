-- Ensure the view used for fetching deep linked machines is accessible
GRANT SELECT ON machines_with_details TO authenticated, anon;
