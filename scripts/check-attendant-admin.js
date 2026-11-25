require('dotenv').config();
const base = process.env.API_URL || 'http://localhost:3000/v1';
const email = process.env.DEMO_STAFF_EMAIL;
const password = process.env.DEMO_STAFF_PASSWORD;

async function main() {
  if (!email || !password) {
    throw new Error('Configure DEMO_STAFF_EMAIL e DEMO_STAFF_PASSWORD no arquivo .env.');
  }

  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await login.json();
  if (!login.ok) throw new Error(`Login do atendente falhou (HTTP ${login.status}).`);
  const refreshCookie = login.headers.get('set-cookie')?.split(';')[0];

  const attempt = await fetch(`${base}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ name: 'Tentativa administrativa bloqueada' }),
  });

  await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(refreshCookie ? { Cookie: refreshCookie } : {}),
    },
  });

  if (attempt.status !== 403) {
    throw new Error(`Esperava HTTP 403 na rota de administrador; recebi HTTP ${attempt.status}.`);
  }
  console.log('PASS: atendente autenticado, POST /categories bloqueado com HTTP 403.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
