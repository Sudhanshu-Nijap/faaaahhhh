const SQL_ERROR_KEYWORDS = [
    "SQL syntax", "MySQL", "PostgreSQL", "ORA-00933", "Unclosed quotation mark", 
    "near 'WHERE'", "database error", "Microsoft OLE DB", "invalid database",
    "sqlite3.OperationalError", "psycopg2.errors", "SQLSTATE"
];

const testSimulatedImpact = (consoleMsg, networkBody) => {
    const sqlSignatures = [];
    
    if (SQL_ERROR_KEYWORDS.some(k => consoleMsg.includes(k))) {
        sqlSignatures.push(`CONSOLE: ${consoleMsg}`);
    }
    
    if (SQL_ERROR_KEYWORDS.some(k => networkBody.includes(k))) {
        sqlSignatures.push(`NETWORK: ${networkBody.substring(0, 50)}`);
    }
    
    const isSQLiMatch = sqlSignatures.length > 0;
    console.log(`[Test]: SQLi Match Found? ${isSQLiMatch}`);
    if (isSQLiMatch) console.log(`[Test]: Signatures: ${sqlSignatures.join(' | ')}`);
    
    return isSQLiMatch;
};

// Test 1: Console Error with SQL Syntax
console.log("\n--- TEST 1: SQL Syntax Error in Console ---");
testSimulatedImpact("Uncaught Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version", "");

// Test 2: Network Response with Postgres Error
console.log("\n--- TEST 2: Postgres Error in Network Response ---");
testSimulatedImpact("", "{\"error\": \"psycopg2.errors.InFailedSqlTransaction: current transaction is aborted, commands ignored until end of transaction block\"}");

// Test 3: Safe Response
console.log("\n--- TEST 3: Safe Response ---");
testSimulatedImpact("Login failed", "{\"status\": \"error\", \"message\": \"invalid credentials\"}");
