const { execSync } = require('child_process');

async function testTsc() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Setup Admin
    const adminEmail = `admin_tsc_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin Tsc" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminToken = (await adminRes.json()).data.tokens.access_token;
    
    // 2. Setup Warga & give balance
    const targetEmail = `warga_tsc_${Date.now()}@example.com`;
    const signupTarget = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123", confirm_password: "Password123", name: "Warga Tsc" })
    });
    const targetData = await signupTarget.json();
    let targetId = targetData.data?.data?.data?.user?.id;
    if (!targetId) targetId = targetData.data?.data?.user?.id;
    if (!targetId) targetId = targetData.data?.user?.id;

    // Inject balance 100,000 to users and balance table
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET total_balance = 100000 WHERE id_users = '${targetId}'; DELETE FROM balance WHERE id_user = '${targetId}'; INSERT INTO balance (id_user, total_balance) VALUES ('${targetId}', 100000);\\""`);

    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123" })
    });
    const userToken = (await wargaRes.json()).data.tokens.access_token;

    console.log("Tokens retrieved successfully. Target ID:", targetId);

    // TSC-01
    const tsc01 = await fetch(`${BASE_URL}/api/v1/transaction/balance`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("TSC-01:", tsc01.status);

    // TSC-02
    const tsc02 = await fetch(`${BASE_URL}/api/v1/transaction/balance`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("TSC-02:", tsc02.status);

    // TSC-03
    const tsc03 = await fetch(`${BASE_URL}/api/v1/transaction/transaction-log`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("TSC-03:", tsc03.status);

    // TSC-04
    const tsc04 = await fetch(`${BASE_URL}/api/v1/transaction/withdrawal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ amount: 999999999 })
    });
    console.log("TSC-04:", tsc04.status);

    // TSC-05
    const tsc05 = await fetch(`${BASE_URL}/api/v1/transaction/withdrawal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ amount: -100 })
    });
    console.log("TSC-05:", tsc05.status);

    // TSC-06
    const tsc06 = await fetch(`${BASE_URL}/api/v1/transaction/withdrawal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ amount: 10000 })
    });
    const tsc06Data = await tsc06.json();
    console.log("TSC-06:", tsc06.status, tsc06Data);

    const id_wd = execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -t -c \\"SELECT id_wd FROM withdrawals WHERE id_user = '${targetId}' ORDER BY created_at DESC LIMIT 1\\""`, { encoding: 'utf-8' }).trim();

    if (id_wd) {
        // TSC-07
        const tsc07 = await fetch(`${BASE_URL}/api/v1/transaction/withdrawal/cancel`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
            body: JSON.stringify({ id_transaksi: id_wd })
        });
        console.log("TSC-07:", tsc07.status);
    }

    // Buat WD lagi untuk diverifikasi Admin
    const tscWd2 = await fetch(`${BASE_URL}/api/v1/transaction/withdrawal`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ amount: 5000 })
    });
    const wd2Data = await tscWd2.json();
    const id_wd2 = execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -t -c \\"SELECT id_wd FROM withdrawals WHERE id_user = '${targetId}' ORDER BY created_at DESC LIMIT 1\\""`, { encoding: 'utf-8' }).trim();

    // TSC-08
    const tsc08 = await fetch(`${BASE_URL}/api/v1/transaction/transaction-logs/admin`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("TSC-08:", tsc08.status);

    // TSC-09
    const tsc09 = await fetch(`${BASE_URL}/api/v1/transaction/transaction-logs/admin`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("TSC-09:", tsc09.status);

    // TSC-10
    const tsc10 = await fetch(`${BASE_URL}/api/v1/transaction/verify-withdrawal/admin`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("TSC-10:", tsc10.status);

    if (id_wd2) {
        // TSC-11
        const tsc11 = await fetch(`${BASE_URL}/api/v1/transaction/verify-withdrawal/admin`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
            body: JSON.stringify({ id_tsc: id_wd2, proccess_type: 'success' })
        });
        console.log("TSC-11 (Should be 403 now!):", tsc11.status);

        // TSC-12
        const tsc12 = await fetch(`${BASE_URL}/api/v1/transaction/verify-withdrawal/admin`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ id_tsc: id_wd2, proccess_type: 'success' })
        });
        console.log("TSC-12:", tsc12.status);
    }

    // TSC-13
    const tsc13 = await fetch(`${BASE_URL}/api/v1/transaction/transaction-logs/admin/user`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ user_id: targetId })
    });
    console.log("TSC-13:", tsc13.status);

}
testTsc().catch(console.error);
