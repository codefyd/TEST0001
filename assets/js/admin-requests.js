document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Guard.requirePlatformAdmin();
    bindLogout();
    await loadRequests();
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'خطأ في التهيئة', err.message || 'تعذر تحميل الصفحة');
  }
});

function bindLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await AuthService.signOut();
    window.location.href = 'index.html';
  });
}

async function loadRequests() {
  Helpers.showLoader('جاري تحميل الطلبات...');
  try {
    const { data, error } = await sb
      .from(APP_CONFIG.TABLES.ORGANIZATION_REQUESTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderRequests(data || []);
  } finally {
    Helpers.hideLoader();
  }
}

function renderRequests(rows) {
  const wrap = document.getElementById('requestsTableWrap');

  if (!rows.length) {
    wrap.innerHTML = `<div class="text-center py-5 text-muted">لا توجد طلبات حاليًا</div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="table align-middle">
      <thead>
        <tr>
          <th>الجهة</th>
          <th>المسؤول</th>
          <th>الجوال</th>
          <th>البريد</th>
          <th>الحالة</th>
          <th>الرمز</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${row.organization_name || ''}</td>
            <td>${row.requester_name || ''}</td>
            <td>${row.phone || ''}</td>
            <td>${row.email || ''}</td>
            <td>${APP_CONFIG.CODES.REQUEST_STATUS[row.status] || row.status}</td>
            <td><code>${row.request_token || ''}</code></td>
            <td>
              <button class="btn btn-sm btn-success rounded-3 me-1" onclick="approveRequest('${row.id}', '${escapeHtml(row.organization_name)}', '${escapeHtml(row.requester_name)}', '${row.email || ''}', '${row.phone || ''}')">
                قبول
              </button>
              <button class="btn btn-sm btn-outline-secondary rounded-3 me-1" onclick="markSent('${row.id}')">
                تم الإرسال
              </button>
              <button class="btn btn-sm btn-outline-danger rounded-3" onclick="rejectRequest('${row.id}')">
                رفض
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function approveRequest(requestId, orgName, requesterName, email, phone) {
  const slug = Helpers.slugifyArabic(orgName) || `org-${Date.now()}`;

  const result = await Swal.fire({
    title: 'قبول الطلب',
    html: `
      <input id="org_slug" class="swal2-input" placeholder="Slug الجهة" value="${slug}">
      <input id="org_email" class="swal2-input" placeholder="البريد" value="${email || ''}">
      <input id="org_phone" class="swal2-input" placeholder="الجوال" value="${phone || ''}">
    `,
    showCancelButton: true,
    confirmButtonText: 'اعتماد وإنشاء جهة',
    cancelButtonText: 'إلغاء',
    preConfirm: () => {
      return {
        slug: document.getElementById('org_slug').value.trim(),
        email: document.getElementById('org_email').value.trim(),
        phone: document.getElementById('org_phone').value.trim()
      };
    }
  });

  if (!result.isConfirmed) return;

  try {
    Helpers.showLoader('جاري إنشاء الجهة...');

    const { data: orgIdData, error: fnError } = await sb.rpc('create_organization_with_defaults', {
      p_name: orgName,
      p_slug: result.value.slug,
      p_contact_name: requesterName,
      p_contact_email: result.value.email,
      p_contact_phone: result.value.phone,
      p_direct_acceptance_enabled: false
    });

    if (fnError) throw fnError;

    const accessUrl = `${location.origin}${location.pathname.replace('admin-requests.html', 'listener.html')}?org=${encodeURIComponent(result.value.slug)}`;

    const { error: linkError } = await sb
      .from(APP_CONFIG.TABLES.ORGANIZATION_ACCESS_LINKS)
      .insert([{
        organization_id: orgIdData,
        link_type: 'P',
        access_url: accessUrl,
        sent_via: 'M',
        sent_to: result.value.phone || result.value.email || '',
        is_active: true
      }]);

    if (linkError) throw linkError;

    const { error: reqError } = await sb
      .from(APP_CONFIG.TABLES.ORGANIZATION_REQUESTS)
      .update({
        status: 'A',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (reqError) throw reqError;

    await Helpers.alert('success', 'تم القبول', `رابط الجهة:\n${accessUrl}`);
    await loadRequests();
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'تعذر قبول الطلب', err.message || 'حدث خطأ');
  } finally {
    Helpers.hideLoader();
  }
}

async function markSent(requestId) {
  try {
    const { error } = await sb
      .from(APP_CONFIG.TABLES.ORGANIZATION_REQUESTS)
      .update({
        status: 'S',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    Helpers.toast('success', 'تم تحديث الحالة');
    await loadRequests();
  } catch (err) {
    Helpers.alert('error', 'تعذر تحديث الحالة', err.message || 'حدث خطأ');
  }
}

async function rejectRequest(requestId) {
  const c = await Helpers.confirm('رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', 'نعم، رفض');
  if (!c.isConfirmed) return;

  try {
    const { error } = await sb
      .from(APP_CONFIG.TABLES.ORGANIZATION_REQUESTS)
      .update({
        status: 'R',
        resolved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    Helpers.toast('success', 'تم رفض الطلب');
    await loadRequests();
  } catch (err) {
    Helpers.alert('error', 'تعذر رفض الطلب', err.message || 'حدث خطأ');
  }
}

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
