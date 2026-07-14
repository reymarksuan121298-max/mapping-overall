DROP POLICY IF EXISTS users_select_public ON users;
CREATE POLICY users_select_public ON users FOR SELECT TO public USING (true);
