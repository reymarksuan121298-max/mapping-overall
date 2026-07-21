const fs = require('fs');

const inputFile = process.argv[2] || 'data.tsv';
const outputFile = process.argv[3] || 'insert.sql';
const tableName = 'employees';

try {
    const data = fs.readFileSync(inputFile, 'utf-8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        console.log("No data found in the input file.");
        process.exit(1);
    }
    
    let sql = `INSERT INTO ${tableName} (employee_id, full_name, franchise_id, supervisor_id, role, area_id, municipality_id, address, latitude, longitude, status) VALUES\n`;
    
    const valuesList = [];
    
    // Start from 1 to skip the header row
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split('\t');
        if (columns.length < 2) continue; // Skip empty or malformed rows
        
        const escapeSql = (str) => {
            if (str === undefined || str === null) return '';
            return str.replace(/'/g, "''").trim();
        };
        
        const emp_id = escapeSql(columns[0]);
        const full_name = escapeSql(columns[1]);
        const franchise = escapeSql(columns[2]);
        const spvr = escapeSql(columns[3]);
        const role = escapeSql(columns[4]);
        const area = escapeSql(columns[5]);
        const municipality = escapeSql(columns[6]);
        const address = escapeSql(columns[7]);
        
        let lat = escapeSql(columns[8]);
        let lon = escapeSql(columns[9]);
        lat = (isNaN(parseFloat(lat)) || lat === '') ? 'NULL' : parseFloat(lat);
        lon = (isNaN(parseFloat(lon)) || lon === '') ? 'NULL' : parseFloat(lon);
        
        const status = escapeSql(columns[10]);
        
        const franchise_subquery = franchise ? `(SELECT id FROM franchises WHERE name = '${franchise}' LIMIT 1)` : 'NULL';
        const spvr_subquery = spvr ? `(SELECT id FROM supervisors WHERE name = '${spvr}' LIMIT 1)` : 'NULL';
        const area_subquery = area ? `(SELECT id FROM areas WHERE name = '${area}' LIMIT 1)` : 'NULL';
        const municipality_subquery = municipality ? `(SELECT id FROM municipalities WHERE name = '${municipality}' LIMIT 1)` : 'NULL';

        valuesList.push(`  ('${emp_id}', '${full_name}', ${franchise_subquery}, ${spvr_subquery}, '${role}', ${area_subquery}, ${municipality_subquery}, '${address}', ${lat}, ${lon}, '${status}')`);
    }
    
    sql += valuesList.join(',\n') + ';\n';
    
    fs.writeFileSync(outputFile, sql);
    console.log(`Successfully generated SQL insert query with ${valuesList.length} rows.`);
    console.log(`Saved to ${outputFile}`);
} catch (error) {
    console.error("Error processing file:", error.message);
}
