const { execSync } = require('child_process');
const fs = require('fs');

async function testAnc() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Signup Admin
    const adminEmail = `admin_anc_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin Anc" })
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
    const wargaEmail = `warga_anc_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123", confirm_password: "Password123", name: "Warga Anc" })
    });
    
    // 5. Login Warga
    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123" })
    });
    const wargaData = await wargaRes.json();
    const userToken = wargaData.data.tokens.access_token;

    console.log("Tokens retrieved successfully");

    // ANC-01: Query invalid
    const anc01 = await fetch(`${BASE_URL}/api/v1/announcements?page=invalid`, {
        headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("ANC-01 Status:", anc01.status);

    // ANC-02: Get seluruh data
    const anc02 = await fetch(`${BASE_URL}/api/v1/announcements`, {
        headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("ANC-02 Status:", anc02.status);

    // ANC-03: Invalid category_id
    const anc03 = await fetch(`${BASE_URL}/api/v1/announcements?category_id=invalid-uuid`, {
        headers: { "Authorization": `Bearer ${userToken}` }
    });
    console.log("ANC-03 Status:", anc03.status, await anc03.json());

    // ANC-04: Get categories
    let categoryId = null;
    const anc04 = await fetch(`${BASE_URL}/api/v1/announcements/announcement-categories`, {
        headers: { "Authorization": `Bearer ${userToken}` }
    });
    const anc04Data = await anc04.json();
    console.log("ANC-04 Status:", anc04.status);
    
    if (anc04Data?.data?.length > 0) {
        categoryId = anc04Data.data[0].id_category || anc04Data.data[0].id;
    } else {
        console.log("No category found, trying to create one or fetching directly from DB");
        categoryId = 'f0e2b10a-b6de-4e31-8bc6-b258380e922e'; // Dummy fallback
    }
    
    console.log("USING CATEGORY ID:", categoryId);

    // ANC-05: Warga create anc
    const formDataWarga = new FormData();
    formDataWarga.append('title', '[TEST] Warga Anc');
    formDataWarga.append('category_id', categoryId);
    
    const anc05 = await fetch(`${BASE_URL}/api/v1/announcements`, {
        method: "POST", headers: { "Authorization": `Bearer ${userToken}` },
        body: formDataWarga
    });
    console.log("ANC-05 Status (Warga Create):", anc05.status, await anc05.json());

    // ANC-07: Admin create valid
    const formDataAdmin = new FormData();
    formDataAdmin.append('title', '[TEST] Pengumuman API');
    formDataAdmin.append('category_id', categoryId);
    formDataAdmin.append('content', JSON.stringify({ p: "Test konten pengumuman" }));

    const anc07 = await fetch(`${BASE_URL}/api/v1/announcements`, {
        method: "POST", headers: { "Authorization": `Bearer ${adminToken}` },
        body: formDataAdmin
    });
    const anc07Data = await anc07.json();
    console.log("ANC-07 Status:", anc07.status, anc07Data);

    const announcementId = anc07Data.data?.data?.id_announcements || anc07Data.data?.id_announcements || anc07Data.data?.id || Object.values(anc07Data.data || {})[0]?.id_announcements;
    console.log("Created Announcement ID:", announcementId);

    if (announcementId) {
        // ANC-08: Edit non-existent
        const anc08 = await fetch(`${BASE_URL}/api/v1/announcements/11111111-1111-1111-1111-111111111111`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ title: "Update" })
        });
        console.log("ANC-08 Status:", anc08.status, await anc08.json());

        // ANC-09: Edit invalid UUID
        const anc09 = await fetch(`${BASE_URL}/api/v1/announcements/invalid-uuid`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ title: "Update" })
        });
        console.log("ANC-09 Status:", anc09.status, await anc09.json());

        // ANC-10: Edit valid
        const anc10 = await fetch(`${BASE_URL}/api/v1/announcements/${announcementId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ title: "[TEST] Update Pengumuman" })
        });
        console.log("ANC-10 Status:", anc10.status, await anc10.json());

        // ANC-14: Get by ID
        const anc14 = await fetch(`${BASE_URL}/api/v1/announcements/${announcementId}`, {
            headers: { "Authorization": `Bearer ${userToken}` }
        });
        console.log("ANC-14 Status:", anc14.status);

        // ANC-11: Warga delete
        const anc11 = await fetch(`${BASE_URL}/api/v1/announcements/${announcementId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${userToken}` }
        });
        console.log("ANC-11 Status:", anc11.status, await anc11.json());
        
        // ANC-12: Admin delete
        const anc12 = await fetch(`${BASE_URL}/api/v1/announcements/${announcementId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("ANC-12 Status:", anc12.status, await anc12.json());

        // ANC-13: Admin delete again
        const anc13 = await fetch(`${BASE_URL}/api/v1/announcements/${announcementId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("ANC-13 Status:", anc13.status, await anc13.json());
    }
}
testAnc().catch(console.error);
