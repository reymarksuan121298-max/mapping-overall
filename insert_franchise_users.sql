-- Add admin user for 5A Royal Gaming OPC
INSERT INTO users (email, password_hash, full_name, role, franchise_id)
VALUES (
    '5aroyal@kioskmap.com',
    '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
    '5A Royal Admin',
    'franchise_admin',
    (SELECT id FROM franchises WHERE name ILIKE '%5a Royal%' LIMIT 1)
) ON CONFLICT (email) DO NOTHING;

-- Add admin user for Glowing Fortune Gaming OPC
INSERT INTO users (email, password_hash, full_name, role, franchise_id)
VALUES (
    'glowingfortune@kioskmap.com',
    '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
    'Glowing Fortune Admin',
    'franchise_admin',
    (SELECT id FROM franchises WHERE name ILIKE '%Glowing Fortune%' LIMIT 1)
) ON CONFLICT (email) DO NOTHING;

-- Add admin user for Lucky Betplay
INSERT INTO users (email, password_hash, full_name, role, franchise_id)
VALUES (
    'luckybetplay@kioskmap.com',
    '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
    'Lucky Betplay Admin',
    'franchise_admin',
    (SELECT id FROM franchises WHERE name ILIKE '%Lucky Betplay%' LIMIT 1)
) ON CONFLICT (email) DO NOTHING;
