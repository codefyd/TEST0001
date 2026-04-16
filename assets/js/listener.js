let currentMemberships = [];
let currentOrganizationId = null;
let currentSettingsMap = {};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentMemberships = await Guard.requireOrganizationMember();
    bindLogout();

    currentOrganizationId = currentMemberships[0]?.organization_id || null;
    await loadSettings();
    await loadFilters();
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

async function loadSettings() {
  const { data, error } = await sb
    .from(APP_CONFIG.TABLES.SETTINGS)
    .select('key, value')
    .eq('organization_id', currentOrganizationId);

  if (error) throw error;

  currentSettingsMap = {};
  (data || []).forEach(item => {
    currentSettingsMap[item.key] = item.value;
  });
}

async function loadFilters() {
  await Promise.all([
    loadTracks(),
    loadHalaqas(),
    loadStudents()
  ]);

  document.getElementById('trackFilter')?.addEventListener('change', loadStudents);
  document.getElementById('halaqaFilter')?.addEventListener('change', loadStudents);
  document.getElementById('studentFilter')?.addEventListener('change', loadStudentPanel);
}

async function loadTracks() {
  const select = document.getElementById('trackFilter');
  const showTrack = currentSettingsMap.showTrackInSelection === 'true';
  const activeTrack = currentSettingsMap.activeTrackForSelection || '';

  if (!showTrack) {
    select.innerHTML = `<option value="">المسار مخفي حسب الإعدادات</option>`;
    select.disabled = true;
    return;
  }

  let query = sb
    .from(APP_CONFIG.TABLES.TRACK_SETTINGS)
    .select('track_name')
    .eq('organization_id', currentOrganizationId)
    .order('track_name');

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).filter(x => !activeTrack || x.track_name === activeTrack);

  select.innerHTML = `<option value="">كل المسارات</option>` +
    rows.map(x => `<option value="${x.track_name}">${x.track_name}</option>`).join('');

  if (activeTrack) {
    select.value = activeTrack;
    select.disabled = true;
  }
}

async function loadHalaqas() {
  const select = document.getElementById('halaqaFilter');
  const hideHalaqas = currentSettingsMap.hideHalaqasAndUseTracksOnly === 'true';

  if (hideHalaqas) {
    select.innerHTML = `<option value="">الحلقات مخفية حسب الإعدادات</option>`;
    select.disabled = true;
    return;
  }

  const { data, error } = await sb
    .from(APP_CONFIG.TABLES.HALAQAS)
    .select('id, name')
    .eq('organization_id', currentOrganizationId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;

  select.innerHTML = `<option value="">كل الحلقات</option>` +
    (data || []).map(x => `<option value="${x.name}">${x.name}</option>`).join('');
}

async function loadStudents() {
  const track = document.getElementById('trackFilter')?.value || '';
  const halaqa = document.getElementById('halaqaFilter')?.value || '';
  const select = document.getElementById('studentFilter');

  let query = sb
    .from(APP_CONFIG.TABLES.STUDENTS)
    .select('id, name, track, halaqa, external_id')
    .eq('organization_id', currentOrganizationId)
    .eq('is_active', true)
    .order('rank_order')
    .order('name');

  if (track) query = query.eq('track', track);
  if (halaqa) query = query.eq('halaqa', halaqa);

  const { data, error } = await query;
  if (error) throw error;

  select.innerHTML = `<option value="">اختر الطالب</option>` +
    (data || []).map(x => `
      <option value="${x.id}">
        ${x.name}${x.halaqa ? ' - ' + x.halaqa : ''}
      </option>
    `).join('');

  document.getElementById('studentPanel').innerHTML = 'اختر الطالب لعرض بياناته';
}

async function loadStudentPanel() {
  const studentId = document.getElementById('studentFilter')?.value;
  const panel = document.getElementById('studentPanel');

  if (!studentId) {
    panel.innerHTML = 'اختر الطالب لعرض بياناته';
    return;
  }

  Helpers.showLoader('جاري تحميل بيانات الطالب...');
  try {
    const { data, error } = await sb
      .from(APP_CONFIG.TABLES.STUDENTS)
      .select(`
        *,
        records (
          id,
          notes,
          sections_json,
          ds,
          ps,
          fs,
          rs
        )
      `)
      .eq('id', studentId)
      .eq('organization_id', currentOrganizationId)
      .single();

    if (error) throw error;

    const record = data.records?.[0] || null;

    panel.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-4">
            <div class="fw-bold mb-2">${data.name}</div>
            <div class="text-muted small">المسار: ${data.track || '-'}</div>
            <div class="text-muted small">الحلقة: ${data.halaqa || '-'}</div>
            <div class="text-muted small">رقم الطالب: ${data.external_id || '-'}</div>
            <div class="text-muted small">ولي الأمر: ${data.guardian_phone || '-'}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-4">
            <div>المقاطع المعروضة: <strong>${record?.ds ?? 0}</strong></div>
            <div>المجتاز: <strong>${record?.ps ?? 0}</strong></div>
            <div>الرسوب: <strong>${record?.fs ?? 0}</strong></div>
            <div>المتبقي: <strong>${record?.rs ?? 60}</strong></div>
          </div>
        </div>
      </div>
      <hr>
      <div>
        <div class="fw-bold mb-2">السجل المختصر</div>
        <pre class="bg-light rounded-4 p-3" style="white-space:pre-wrap;">${JSON.stringify(record?.sections_json || [], null, 2)}</pre>
      </div>
    `;
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'تعذر تحميل بيانات الطالب', err.message || 'حدث خطأ');
  } finally {
    Helpers.hideLoader();
  }
}
