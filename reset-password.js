const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const resetForm = document.getElementById('reset-form');
const resetBtn = document.getElementById('reset-btn');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');

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

// Supabase automatically picks up the recovery token from the URL hash
sb.auth.onAuthStateChange(async (event, session) => {
  // PASSWORD_RECOVERY event signals the token is valid and the form is active
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetBtn.disabled = true;
  resetBtn.textContent = 'Updating…';
  resetError.style.display = 'none';
  resetSuccess.style.display = 'none';

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    resetError.textContent = 'Passwords do not match.';
    resetError.style.display = 'block';
    resetBtn.disabled = false;
    resetBtn.textContent = 'Update Password';
    return;
  }

  if (newPassword.length < 6) {
    resetError.textContent = 'Password must be at least 6 characters.';
    resetError.style.display = 'block';
    resetBtn.disabled = false;
    resetBtn.textContent = 'Update Password';
    return;
  }

  const { data, error } = await sb.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    resetError.textContent = 'Unable to update password. The reset link may have expired. Please request a new one.';
    resetError.style.display = 'block';
    resetBtn.disabled = false;
    resetBtn.textContent = 'Update Password';
  } else {
    resetSuccess.textContent = 'Password updated successfully! Redirecting to login…';
    resetSuccess.style.display = 'block';
    resetForm.style.display = 'none';

    setTimeout(async () => {
      await sb.auth.signOut();
      window.location.href = '/login';
    }, 2000);
  }
});
