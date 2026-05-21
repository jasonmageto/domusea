SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admins' OR table_name = 'tenants';
