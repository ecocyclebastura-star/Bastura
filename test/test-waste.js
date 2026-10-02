const { execSync } = require('child_process');

async function testWaste() {
    const BASE_URL = "http://100.100.229.39:3000";
    
    // 1. Signup Admin
    const adminEmail = `admin_waste_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123", confirm_password: "Password123", name: "Admin Waste" })
    });
    execSync(`ssh enbee@100.100.229.39 "docker exec bastura-db psql -U ecocycle.bastura@gmail.com -d bastura -c \\"UPDATE users SET role_id = 2 WHERE email = '${adminEmail}'\\""`);
    
    const adminRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: "Password123" })
    });
    const adminToken = (await adminRes.json()).data.tokens.access_token;
    
    // 2. Signup Warga
    const wargaEmail = `warga_waste_${Date.now()}@example.com`;
    await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123", confirm_password: "Password123", name: "Warga Waste" })
    });
    
    const wargaRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: wargaEmail, password: "Password123" })
    });
    const userToken = (await wargaRes.json()).data.tokens.access_token;

    console.log("Tokens retrieved successfully");

    // CAT-01
    const cat01 = await fetch(`${BASE_URL}/api/v1/waste/catalog`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("CAT-01 Status:", cat01.status);

    // CAT-02
    let categoryIdWaste = null;
    const cat02 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-categories`, { headers: { "Authorization": `Bearer ${adminToken}` } });
    const cat02Data = await cat02.json();
    console.log("CAT-02 Status:", cat02.status);
    if (cat02Data?.data?.length > 0) {
        categoryIdWaste = cat02Data.data[0].id_category || cat02Data.data[0].id;
    } else {
        categoryIdWaste = 1; // Fallback to 1 if no categories
    }
    console.log("USING CATEGORY ID:", categoryIdWaste);

    // CAT-03
    const cat03 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-categories`, { headers: { "Authorization": `Bearer ${userToken}` } });
    console.log("CAT-03 Status:", cat03.status);

    // CAT-04
    const cat04 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ name: "[TEST] Invalid Price", category_id: categoryIdWaste, unit: "kg", price: -1000 })
    });
    console.log("CAT-04 Status:", cat04.status, await cat04.json());

    // CAT-05
    const cat05 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ name: "[TEST] Invalid Category", category_id: 999999, unit: "kg", price: 1000 })
    });
    console.log("CAT-05 Status:", cat05.status, await cat05.json());

    // CAT-06
    const cat06 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
        body: JSON.stringify({ name: "[TEST] Kardus Tebal", category_id: categoryIdWaste, unit: "kg", price: 1000 })
    });
    const cat06Data = await cat06.json();
    console.log("CAT-06 Status:", cat06.status, cat06Data);
    
    let wasteId = cat06Data.data?.id_waste || cat06Data.data?.data?.id_waste || cat06Data.data?.id;
    if (!wasteId && cat06Data.data) wasteId = Object.values(cat06Data.data)[0]?.id_waste;
    console.log("Created Waste ID:", wasteId);

    if (wasteId) {
        // CAT-07
        const cat07 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ name: "[TEST] Kardus Tebal", category_id: categoryIdWaste, unit: "kg", price: 1000 })
        });
        console.log("CAT-07 Status:", cat07.status, await cat07.json());

        // CAT-08
        const cat08 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types/999999`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ name: "[TEST] Kardus Tebal Edit" })
        });
        console.log("CAT-08 Status:", cat08.status, await cat08.json());

        // CAT-09
        const cat09 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types/${wasteId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
            body: JSON.stringify({ name: "[TEST] Kardus Tebal Edit", price: 1500 })
        });
        console.log("CAT-09 Status:", cat09.status, await cat09.json());

        // CAT-11
        const cat11 = await fetch(`${BASE_URL}/api/v1/waste/admin/waste-types/${wasteId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
        });
        console.log("CAT-11 Status:", cat11.status, await cat11.json());
    }
}
testWaste().catch(console.error);
