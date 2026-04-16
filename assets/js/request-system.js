document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('requestForm');
  const resultBox = document.getElementById('requestResult');
  const submitBtn = document.getElementById('submitRequestBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    Helpers.disableBtn(submitBtn);

    try {
      const organization_name = document.getElementById('organization_name').value.trim();
      const requester_name = document.getElementById('requester_name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = Helpers.normalizePhone(document.getElementById('phone').value);
      const notes = document.getElementById('notes').value.trim();

      const { data, error } = await window.sb
        .from(APP_CONFIG.TABLES.ORGANIZATION_REQUESTS)
        .insert([{
          organization_name,
          requester_name,
          email,
          phone,
          notes,
          source: 'public_form',
          status: 'P'
        }])
        .select()
        .single();

      if (error) throw error;

      resultBox.innerHTML = `
        <div class="alert alert-success rounded-4">
          <div class="fw-bold mb-2">تم إرسال الطلب بنجاح</div>
          <div>رقم الطلب: <strong>${data.request_token}</strong></div>
          <div class="mt-2 text-muted">سيتم مراجعة الطلب، وإذا كانت الجهة مفعّل لها القبول المباشر فسيظهر الرابط مباشرة في النسخة المتقدمة لاحقًا.</div>
        </div>
      `;

      form.reset();
      Helpers.toast('success', 'تم إرسال الطلب');
    } catch (err) {
      console.error(err);
      Helpers.alert('error', 'تعذر إرسال الطلب', err.message || 'حدث خطأ غير متوقع');
    } finally {
      Helpers.enableBtn(submitBtn);
    }
  });
});
