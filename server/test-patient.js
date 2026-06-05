import fetch from 'node-fetch';

async function test() {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@speechsync.in', password: 'admin' }) // assuming default
    });
    const loginRes = await login.json();
    const { token } = loginRes;
    if (!token) {
        console.log("No token, can't test", loginRes);
        return;
    }

    const res = await fetch('http://localhost:5000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Test Patient',
        dob: '2015-01-01',
        gender: 'Male',
        guardianName: 'Test Guardian',
        guardianPhone: '1234567890',
        guardianEmail: 'guardian@example.com',
        diagnoses: ['Speech Sound Disorder'],
        assignedSlpId: 'some-id-doesnt-matter-if-admin',
        createParentPortalAccount: true
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
test();
