-- Fix RLS Policies for Kiosk Map Dashboard (Public Read Access)
-- Run this in the Supabase SQL Editor

-- Allow public read access to franchises
DROP POLICY IF EXISTS franchises_select_public ON franchises;
CREATE POLICY franchises_select_public ON franchises
    FOR SELECT TO public USING (true);

-- Allow public read access to areas
DROP POLICY IF EXISTS areas_select_public ON areas;
CREATE POLICY areas_select_public ON areas
    FOR SELECT TO public USING (true);

-- Allow public read access to municipalities
DROP POLICY IF EXISTS municipalities_select_public ON municipalities;
CREATE POLICY municipalities_select_public ON municipalities
    FOR SELECT TO public USING (true);

-- Allow public read access to supervisors
DROP POLICY IF EXISTS supervisors_select_public ON supervisors;
CREATE POLICY supervisors_select_public ON supervisors
    FOR SELECT TO public USING (true);

-- Allow public read access to employees
DROP POLICY IF EXISTS employees_select_public ON employees;
CREATE POLICY employees_select_public ON employees
    FOR SELECT TO public USING (true);

-- Drop the overly restrictive "authenticated" ONLY policies
DROP POLICY IF EXISTS franchises_select_authenticated ON franchises;
DROP POLICY IF EXISTS employees_select_authenticated ON employees;
DROP POLICY IF EXISTS supervisors_all_authenticated ON supervisors;
DROP POLICY IF EXISTS areas_all_authenticated ON areas;
DROP POLICY IF EXISTS municipalities_all_authenticated ON municipalities;

-- Re-add write protections for authenticated users (Optional, to secure write access)
CREATE POLICY supervisors_all_authenticated ON supervisors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY areas_all_authenticated ON areas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY municipalities_all_authenticated ON municipalities FOR ALL TO authenticated USING (true) WITH CHECK (true);
