const { execSync } = require('child_process');

async function testUsers() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Signup Super Admin
    const superAdminEmail = `super_user_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: superAdminEmail, password: "Password123", confirm_password: "Password123", name: "Super Admin User" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 3 WHERE email = '${superAdminEmail}'\\""`);
    
    const superAdminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: superAdminEmail, password: "Password123" })
    });
    const superAdminToken = (await superAdminRes.json()).data.tokens.access_token;

    // 2. Signup Admin
    const adminEmail = `admin_user_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin User" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminToken = (await adminRes.json()).data.tokens.access_token;
    
    // 3. Signup Target User (Warga)
    const targetEmail = `warga_user_${Date.now()}@example.com`;
    const signupTarget = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123", confirm_password: "Password123", name: "Warga User" })
    });
    const targetData = await signupTarget.json();
    let targetId = targetData.data?.data?.data?.user?.id;
    if (!targetId) targetId = targetData.data?.data?.user?.id;

    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: "Password123" })
    });
    const userToken = (await wargaRes.json()).data.tokens.access_token;

    console.log("Tokens retrieved successfully. Target ID:", targetId);

    // USER-01
    const u01 = await fetch(`${BASE_URL}/api/v1/users/account/profile`);
    console.log("USER-01:", u01.status);

    // USER-03
    const u03 = await fetch(`${BASE_URL}/api/v1/users/account/profile`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("USER-03:", u03.status);

    // USER-04
    const u04 = await fetch(`${BASE_URL}/api/v1/users/account/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ name: "[TEST] Nama Baru" })
    });
    console.log("USER-04:", u04.status);

    // USER-06
    const u06 = await fetch(`${BASE_URL}/api/v1/users/account/profile/changepass`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ old_password: "WrongPassword123", new_password: "Password1234", conf_password: "Password1234" })
    });
    console.log("USER-06:", u06.status);

    // USER-09
    const u09 = await fetch(`${BASE_URL}/api/v1/users/account/warga`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("USER-09:", u09.status);

    // USER-10
    const u10 = await fetch(`${BASE_URL}/api/v1/users/account/warga`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    console.log("USER-10:", u10.status);

    // USER-11
    const u11 = await fetch(`${BASE_URL}/api/v1/users/account/warga/block/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${adminToken}` }
    });
    console.log("USER-11:", u11.status);

    // USER-12
    const u12 = await fetch(`${BASE_URL}/api/v1/users/account/warga/block/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("USER-12:", u12.status);

    // USER-14
    const u14 = await fetch(`${BASE_URL}/api/v1/users/account/warga/unblock/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${adminToken}` }
    });
    console.log("USER-14:", u14.status);

    // USER-15
    const u15 = await fetch(`${BASE_URL}/api/v1/users/account/warga/promote/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${adminToken}` }
    });
    console.log("USER-15:", u15.status);

    // USER-16
    const u16 = await fetch(`${BASE_URL}/api/v1/users/account/warga/promote/not-a-uuid`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${superAdminToken}` }
    });
    console.log("USER-16:", u16.status);

    // USER-18
    const u18 = await fetch(`${BASE_URL}/api/v1/users/account/warga/promote/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${superAdminToken}` }
    });
    console.log("USER-18:", u18.status);

    // USER-22
    const u22 = await fetch(`${BASE_URL}/api/v1/users/account/warga/demote/${targetId}`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${superAdminToken}` }
    });
    console.log("USER-22:", u22.status);

    // USER-23
    const u23 = await fetch(`${BASE_URL}/api/v1/users/account/profile/deactive`, {
        method: "PATCH", headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("USER-23:", u23.status);

}
testUsers().catch(console.error);
