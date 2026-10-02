async function testAuth() {
    const BASE_URL = "http://100.100.229.39:3000";
    const testEmail = `warga_auth_${Date.now()}@example.com`;
    const password = "Password123!";

    console.log("=== Testing Auth Module ===");

    // 1. Signup
    console.log("\n[AUTH-01] Testing Signup...");
    const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: password, confirm_password: password, name: "Warga Test Auth" })
    });
    const signupData = await signupRes.json();
    console.log("Signup Status:", signupRes.status);
    console.log("Signup Response:", signupData);

    // 2. Login
    console.log("\n[AUTH-02] Testing Login...");
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: password })
    });
    const loginData = await loginRes.json();
    console.log("Login Status:", loginRes.status);
    
    let token = null;
    let rf_token = null;
    if (loginData.data && loginData.data.tokens) {
        token = loginData.data.tokens.access_token;
        rf_token = loginData.data.tokens.refresh_token;
        console.log("Login Success! Token retrieved.");
    }

    // 3. Logout (if token exists)
    if (token && rf_token) {
        console.log("\n[AUTH-03] Testing Logout...");
        const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ rf_token: rf_token })
        });
        const logoutData = await logoutRes.json();
        console.log("Logout Status:", logoutRes.status);
        console.log("Logout Response:", logoutData);
    }
}

testAuth().catch(console.error);
