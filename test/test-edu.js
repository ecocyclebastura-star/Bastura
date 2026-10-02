const { execSync } = require('child_process');
const fs = require('fs');

async function testEdu() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Signup Admin
    const adminEmail = `admin_test_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin Test" })
    });
    
    // 2. Promote Admin via DB
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    // 3. Login Admin
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminData = await adminRes.json();
    const adminToken = adminData.data.tokens.access_token;
    
    // 4. Signup Warga
    const wargaEmail = `warga_test_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123", confirm_password: "Password123", name: "Warga Test" })
    });
    
    // 5. Login Warga
    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123" })
    });
    const wargaData = await wargaRes.json();
    const userToken = wargaData.data.tokens.access_token;

    console.log("Tokens retrieved successfully");

    // Scenarios
    // EDU-01: Mengakses tanpa token (Wait, GET /api/v1/education is Public according to docs? "Konten edukasi bisa diakses Warga". Let's test if it returns 200 or 401 without token)
    const edu01 = await fetch(`${BASE_URL}/api/v1/education`);
    console.log("EDU-01 Status:", edu01.status);

    // EDU-02: Get seluruh data edukasi
    const edu02 = await fetch(`${BASE_URL}/api/v1/education`, {
        headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("EDU-02 Status:", edu02.status, await edu02.json());

    // EDU-03: Create with empty title
    const edu03 = await fetch(`${BASE_URL}/api/v1/education/admin/education`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ title: "", content: { p: "Test" } })
    });
    console.log("EDU-03 Status:", edu03.status, await edu03.json());

    // EDU-05: Create valid
    const edu05 = await fetch(`${BASE_URL}/api/v1/education/admin/education`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ title: "[TEST] Edukasi API", content: { p: "Test konten edukasi" } })
    });
    const edu05Data = await edu05.json();
    console.log("EDU-05 Status:", edu05.status, edu05Data);

    const educationId = edu05Data.data?.data?.id_content || edu05Data.data?.id_content || edu05Data.data?.id_education || edu05Data.data?.id || Object.values(edu05Data.data || {})[0]?.id_content;
    console.log("Created Education ID:", educationId);

    if (educationId) {
        // EDU-06: Upload without file
        const edu06 = await fetch(`${BASE_URL}/api/v1/education/admin/education/${educationId}/photo`, {
            method: "PATCH", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("EDU-06 Status:", edu06.status, await edu06.json());

        // EDU-09: Edit Edukasi
        const edu09 = await fetch(`${BASE_URL}/api/v1/education/admin/education/${educationId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ title: "[TEST] Update Edukasi" })
        });
        console.log("EDU-09 Status:", edu09.status, await edu09.json());

        // EDU-10: Delete Edukasi
        const edu10 = await fetch(`${BASE_URL}/api/v1/education/admin/education/${educationId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("EDU-10 Status:", edu10.status, await edu10.json());
        
        // EDU-11: Delete again
        const edu11 = await fetch(`${BASE_URL}/api/v1/education/admin/education/${educationId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("EDU-11 Status:", edu11.status, await edu11.json());
    }
}
testEdu().catch(console.error);
