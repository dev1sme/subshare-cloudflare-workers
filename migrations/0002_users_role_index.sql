-- The "last admin" checks count admins (SELECT COUNT(*) FROM users WHERE role = 'ADMIN')
-- on every demotion and delete; every filtered query gets an index (docs/deployment.md).
CREATE INDEX users_role ON users (role);
