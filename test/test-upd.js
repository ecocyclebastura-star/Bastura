const { execSync } = require('child_process');

async function testUpdates() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Setup Admin
    const adminEmail = `admin_upd_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin Upd" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminToken = (await adminRes.json()).data.tokens.access_token;
    
    // 2. Setup Warga
    const targetEmail = `warga_upd_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123", confirm_password: "Password123", name: "Warga Upd" })
    });

    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123" })
    });
    const userToken = (await wargaRes.json()).data.tokens.access_token;

    console.log("Tokens retrieved successfully");

    // UPD-01
    const upd01 = await fetch(`${BASE_URL}/api/v1/updates`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("UPD-01:", upd01.status);

    // UPD-02
    const upd02 = await fetch(`${BASE_URL}/api/v1/updates`);
    console.log("UPD-02:", upd02.status);

    // UPD-03
    const upd03 = await fetch(`${BASE_URL}/api/v1/updates/get-jadwal`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("UPD-03:", upd03.status);

    // UPD-04
    const upd04 = await fetch(`${BASE_URL}/api/v1/updates/get-jadwal`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("UPD-04:", upd04.status);

    // UPD-05
    const upd05 = await fetch(`${BASE_URL}/api/v1/updates/insert-jadwal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ setor_time: new Date().toISOString() })
    });
    console.log("UPD-05:", upd05.status);

    // UPD-06
    const upd06 = await fetch(`${BASE_URL}/api/v1/updates/insert-jadwal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({})
    });
    console.log("UPD-06:", upd06.status);

    // UPD-07
    const upd07 = await fetch(`${BASE_URL}/api/v1/updates/insert-jadwal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ time: new Date().toISOString() }) // Oh wait, docs say "setor_time", but maybe it's "time". I will send both.
    });
    console.log("UPD-07:", upd07.status);
    
    const upd07Data = await fetch(`${BASE_URL}/api/v1/updates/insert-jadwal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ setor_time: new Date().toISOString() })
    });
    console.log("UPD-07 (setor_time):", upd07Data.status);

}
testUpdates().catch(console.error);
