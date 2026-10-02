const fs = require('fs');

const BASE_URL = "http://100.100.229.39:3000";

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return { status: res.status, data };
}

async function testRBAC() {
    console.log("=== STARTING RBAC TESTS ===");
    
    // 1. Login to all 3 roles
    const userLogin = await login('test_rbac_user@example.com', 'password123');
    const adminLogin = await login('test_rbac_admin@example.com', 'password123');
    const saLogin = await login('test_rbac_superadmin@example.com', 'password123');
    
    console.log("User Login:", userLogin.status);
    console.log("Admin Login:", adminLogin.status);
    console.log("SuperAdmin Login:", saLogin.status);
    
    if(userLogin.status !== 200 || adminLogin.status !== 200 || saLogin.status !== 200) {
        console.error("Login failed for one or more users. Exiting.");
        return;
    }
    
    const userToken = userLogin.data.data.tokens.access_token;
    const adminToken = adminLogin.data.data.tokens.access_token;
    const saToken = saLogin.data.data.tokens.access_token;
    
    // TEST 1: Super Admin Action (Promote Admin)
    console.log("\n--- TEST 1: Super Admin actions ---");
    // Only Super Admin should be able to promote
    const promoteTarget = userLogin.data.data.user.id; // The user ID
    
    const saPromote = await fetch(`${BASE_URL}/api/v1/admin/promote/${promoteTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` }
    });
    console.log("SA Promote Admin:", saPromote.status, await saPromote.text()); // Expect 200

    const adminPromote = await fetch(`${BASE_URL}/api/v1/admin/promote/${promoteTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    });
    console.log("Admin Promote Admin:", adminPromote.status); // Expect 403
    
    const userPromote = await fetch(`${BASE_URL}/api/v1/admin/promote/${promoteTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` }
    });
    console.log("User Promote Admin:", userPromote.status); // Expect 403


    // TEST 2: Admin Action (Add Waste Catalog or Block Users)
    console.log("\n--- TEST 2: Admin actions (Management) ---");
    const adminBlock = await fetch(`${BASE_URL}/api/v1/users/account/warga/block/${promoteTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    });
    console.log("Admin Block User:", adminBlock.status, await adminBlock.text()); // Expect 200

    const userBlock = await fetch(`${BASE_URL}/api/v1/users/account/warga/block/${adminLogin.data.data.id_users}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` }
    });
    console.log("User Block User:", userBlock.status); // Expect 401/403

    const saBlock = await fetch(`${BASE_URL}/api/v1/users/account/warga/block/${promoteTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` }
    });
    console.log("SA Block User:", saBlock.status, await saBlock.text()); // Expect 200

    // TEST 3: User Action / RLS (Edit profile)
    console.log("\n--- TEST 3: User actions & RLS (Edit profile) ---");
    const adminEditUserProfile = await fetch(`${BASE_URL}/api/v1/users/edit-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ name: "Hacked by Admin" })
    });
    console.log("Admin Edit Own Profile (RLS):", adminEditUserProfile.status); // Expect 200 for their OWN profile
    
    const userEditProfile = await fetch(`${BASE_URL}/api/v1/users/edit-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({ name: "User Updated" })
    });
    console.log("User Edit Own Profile (RLS):", userEditProfile.status); // Expect 200

    console.log("\n=== RBAC TESTS COMPLETE ===");
}

testRBAC().catch(console.error);
