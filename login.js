const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// If already logged in, go to dashboard
(async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) window.location.href = '/dashboard';
})();

// Password visibility toggles
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
});

// Toggle between login and forgot password forms
document.getElementById('show-forgot').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form-wrap').style.display = 'none';
  document.getElementById('forgot-form-wrap').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-form-wrap').style.display = 'none';
  document.getElementById('login-form-wrap').style.display = 'block';
});

// LOGIN
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  loginError.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = 'Invalid email or password. Please try again.';
    loginError.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  } else {
    window.location.href = '/dashboard';
  }
});

// FORGOT PASSWORD
const forgotForm = document.getElementById('forgot-form');
const forgotBtn = document.getElementById('forgot-btn');
const forgotError = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotBtn.disabled = true;
  forgotBtn.textContent = 'Sending…';
  forgotError.style.display = 'none';
  forgotSuccess.style.display = 'none';

  const email = document.getElementById('forgot-email').value.trim();

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://blacksaltcapitallp.com/reset-password',
  });

  if (error) {
    forgotError.textContent = 'Something went wrong. Please try again.';
    forgotError.style.display = 'block';
  } else {
    forgotSuccess.textContent = 'Check your email for a password reset link.';
    forgotSuccess.style.display = 'block';
  }

  forgotBtn.disabled = false;
  forgotBtn.textContent = 'Send Reset Link';
});
