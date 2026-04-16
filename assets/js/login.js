document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const btn = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  togglePassword?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.innerHTML = isPassword
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    Helpers.disableBtn(btn);

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      await AuthService.signIn(email, password);

      const profile = await AuthService.getMyProfile();

      if (profile?.role === 'PA') {
        window.location.href = 'admin-requests.html';
        return;
      }

      window.location.href = 'listener.html';
    } catch (err) {
      console.error(err);
      Helpers.alert('error', 'تعذر تسجيل الدخول', err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      Helpers.enableBtn(btn);
    }
  });
});
