async function testApi() {
    const resLoginEmpty = await fetch("http://100.100.229.39:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    console.log("AUTH-01 (Empty body):", await resLoginEmpty.json());

    const resLoginWrongPwd = await fetch("http://100.100.229.39:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrong" })
    });
    console.log("AUTH-02 (Wrong Pwd/Not Found):", await resLoginWrongPwd.json());

    const resSignup = await fetch("http://100.100.229.39:3000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `test_warga_${Date.now()}@example.com`,
            password: "Password123",
            confirm_password: "Password123",
            name: "Warga Test"
        })
    });
    const signupData = await resSignup.json();
    console.log("AUTH-10 (Signup):", signupData);
    
    if(signupData.status === 'success') {
        const { email } = signupData.data.data.user;
        const resLoginValid = await fetch("http://100.100.229.39:3000/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: "Password123" })
        });
        console.log("AUTH-05 (Login Valid):", await resLoginValid.json());
    }
}
testApi().catch(console.error);
