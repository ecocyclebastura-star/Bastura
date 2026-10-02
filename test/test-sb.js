const { execSync } = require('child_process');

async function testSplitBills() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Setup Admin
    const adminEmail = `admin_sb_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin SB" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminToken = (await adminRes.json()).data.tokens.access_token;
    
    console.log("Tokens retrieved successfully");

    // SPB-01
    const spb01 = await fetch(`${BASE_URL}/api/v1/splitbills/history`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("SPB-01:", spb01.status);

    // SPB-02
    const spb02 = await fetch(`${BASE_URL}/api/v1/splitbills/init`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ total_dana: 500000, date_end: "2026-07-31" })
    });
    console.log("SPB-02:", spb02.status);

    // SPB-03
    const spb03 = await fetch(`${BASE_URL}/api/v1/splitbills/init`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ total_dana: 500000, date_start: "2026-07-31", date_end: "2026-07-01" })
    });
    console.log("SPB-03:", spb03.status);

    // SPB-04
    const spb04 = await fetch(`${BASE_URL}/api/v1/splitbills/init`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ total_dana: 500000, date_start: "2000-01-01", date_end: "2000-01-31" })
    });
    console.log("SPB-04:", spb04.status);

    // SPB-05
    const spb05 = await fetch(`${BASE_URL}/api/v1/splitbills/init`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ total_dana: 500000, date_start: "2026-07-01", date_end: "2026-07-31" })
    });
    const spb05Data = await spb05.json();
    console.log("SPB-05:", spb05.status, JSON.stringify(spb05Data).substring(0, 100));

    // SPB-06
    const spb06 = await fetch(`${BASE_URL}/api/v1/splitbills/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ total_dana: 500000, warga_allocations: [], date_start: "2026-07-01", date_end: "2026-07-31" })
    });
    console.log("SPB-06:", spb06.status);

}
testSplitBills().catch(console.error);
