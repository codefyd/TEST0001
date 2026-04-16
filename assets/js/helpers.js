window.Helpers = {
  showLoader(title = 'جاري المعالجة...') {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
  },

  hideLoader() {
    Swal.close();
  },

  toast(icon = 'success', title = '') {
    Swal.fire({
      toast: true,
      position: 'top',
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  },

  alert(icon, title, text = '') {
    return Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: 'حسنًا'
    });
  },

  confirm(title, text = '', confirmButtonText = 'تأكيد') {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'إلغاء'
    });
  },

  normalizePhone(value = '') {
    return String(value).replace(/\D/g, '').trim();
  },

  slugifyArabic(text = '') {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
  },

  formatDateCode(date = new Date()) {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const jsDay = d.getDay(); // 0 الأحد في JS? لا، 0 الأحد
    const map = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };
    const weekday = map[jsDay];
    return `${dd}${mm}${yy}-${weekday}`;
  },

  parseDateCode(code = '') {
    if (!code || !code.includes('-')) return '';
    const [datePart, weekPart] = code.split('-');
    if (datePart.length !== 6) return code;
    const dd = datePart.slice(0, 2);
    const mm = datePart.slice(2, 4);
    const yy = datePart.slice(4, 6);
    const weekday = window.APP_CONFIG.CODES.WEEKDAY[weekPart] || '';
    return `${dd}/${mm}/20${yy}${weekday ? ' - ' + weekday : ''}`;
  },

  buildWhatsAppUrl(phone, message) {
    const cleaned = this.normalizePhone(phone);
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  },

  replaceTemplate(template = '', payload = {}) {
    let result = template;
    Object.keys(payload).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, payload[key] ?? '');
    });
    return result;
  },

  disableBtn(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التنفيذ';
  },

  enableBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'تنفيذ';
  }
};
