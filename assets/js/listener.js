let currentMemberships = [];
let currentOrganizationId = null;
let currentSettingsMap = {};
let currentStudent = null;
let currentRecord = null;
let currentSections = [];
let myProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentMemberships = await Guard.requireOrganizationMember();
    myProfile = await AuthService.getMyProfile();
    bindLogout();

    if (myProfile?.role === 'PA') {
      document.getElementById('adminLink')?.classList.remove('d-none');
    }

    currentOrganizationId = currentMemberships[0]?.organization_id || null;

    await loadSettings();
    await loadFilters();

    document.getElementById('reloadBtn')?.addEventListener('click', async () => {
      await loadSettings();
      await loadFilters();
    });

    document.getElementById('trackFilter')?.addEventListener('change', loadStudents);
    document.getElementById('halaqaFilter')?.addEventListener('change', loadStudents);
    document.getElementById('studentFilter')?.addEventListener('change', loadStudentData);
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'خطأ في التهيئة', err.message || 'تعذر تحميل الصفحة');
  }
});

function bindLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await AuthService.signOut();
    window.location.href = 'login.html';
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
  await Promise.all([loadTracks(), loadHalaqas(), loadStudents()]);
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

  const { data, error } = await sb
    .from(APP_CONFIG.TABLES.TRACK_SETTINGS)
    .select('track_name')
    .eq('organization_id', currentOrganizationId)
    .order('track_name');

  if (error) throw error;

  const rows = (data || []).filter(x => !activeTrack || x.track_name === activeTrack);

  select.innerHTML = `<option value="">كل المسارات</option>` +
    rows.map(x => `<option value="${escapeHtml(x.track_name)}">${escapeHtml(x.track_name)}</option>`).join('');

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
    .select('name')
    .eq('organization_id', currentOrganizationId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;

  select.innerHTML = `<option value="">كل الحلقات</option>` +
    (data || []).map(x => `<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join('');
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
        ${escapeHtml(x.name)}${x.halaqa ? ' - ' + escapeHtml(x.halaqa) : ''}
      </option>
    `).join('');

  resetStudentView();
}

function resetStudentView() {
  currentStudent = null;
  currentRecord = null;
  currentSections = [];
  document.getElementById('studentPanel').innerHTML = `<div class="alert alert-light border rounded-4">اختر الطالب لعرض بياناته</div>`;
  document.getElementById('sectionsWrap').innerHTML = '';
}

async function loadStudentData() {
  const studentId = document.getElementById('studentFilter')?.value;
  if (!studentId) {
    resetStudentView();
    return;
  }

  Helpers.showLoader('جاري تحميل بيانات الطالب...');
  try {
    const { data: student, error } = await sb
      .from(APP_CONFIG.TABLES.STUDENTS)
      .select('*')
      .eq('id', studentId)
      .eq('organization_id', currentOrganizationId)
      .single();

    if (error) throw error;

    const { data: recordRows, error: recordError } = await sb
      .from(APP_CONFIG.TABLES.RECORDS)
      .select('*')
      .eq('student_id', studentId)
      .eq('organization_id', currentOrganizationId)
      .limit(1);

    if (recordError) throw recordError;

    currentStudent = student;
    currentRecord = recordRows?.[0] || null;
    currentSections = normalizeSections(currentRecord?.sections_json || []);

    renderStudentPanel();
    renderSections();
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'تعذر تحميل بيانات الطالب', err.message || 'حدث خطأ');
  } finally {
    Helpers.hideLoader();
  }
}

function normalizeSections(raw) {
  const map = new Map();
  (raw || []).forEach(item => {
    map.set(Number(item.s), {
      s: Number(item.s),
      b: Number(item.b ?? 10),
      m: Number(item.m ?? 0),
      w: Number(item.w ?? 0),
      f: Number(item.f ?? 10),
      p: Number(item.p ?? 0),
      r: item.r || '',
      n: item.n || '',
      d: item.d || ''
    });
  });
  return Array.from(map.values()).sort((a, b) => a.s - b.s);
}

function renderStudentPanel() {
  const panel = document.getElementById('studentPanel');
  const ds = currentRecord?.ds ?? currentSections.length;
  const ps = currentRecord?.ps ?? currentSections.filter(x => x.p === 1).length;
  const fs = currentRecord?.fs ?? currentSections.filter(x => x.p === 0).length;
  const rs = currentRecord?.rs ?? Math.max(60 - ds, 0);

  panel.innerHTML = `
    <div class="row g-3">
      <div class="col-lg-3 col-md-6">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">الطالب</div>
            <div class="fw-bold fs-5">${escapeHtml(currentStudent.name || '-')}</div>
            <div class="small text-muted mt-2">المسار: ${escapeHtml(currentStudent.track || '-')}</div>
            <div class="small text-muted">الحلقة: ${escapeHtml(currentStudent.halaqa || '-')}</div>
          </div>
        </div>
      </div>

      <div class="col-lg-3 col-md-6">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">المقاطع المعروضة</div>
            <div class="fw-bold fs-3">${ds}</div>
          </div>
        </div>
      </div>

      <div class="col-lg-2 col-md-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">المجتاز</div>
            <div class="fw-bold fs-3 text-success">${ps}</div>
          </div>
        </div>
      </div>

      <div class="col-lg-2 col-md-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">الرسوب</div>
            <div class="fw-bold fs-3 text-danger">${fs}</div>
          </div>
        </div>
      </div>

      <div class="col-lg-2 col-md-4">
        <div class="card kpi-card">
          <div class="card-body">
            <div class="text-muted small">المتبقي</div>
            <div class="fw-bold fs-3">${rs}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex flex-wrap gap-2 mt-3">
      <button class="btn rounded-3 text-white" style="background:#014979;" onclick="addNewSection()">
        <i class="fa-solid fa-plus"></i>
        إضافة مقطع
      </button>

      <button class="btn btn-outline-success rounded-3" onclick="saveAllSections()">
        <i class="fa-solid fa-floppy-disk"></i>
        حفظ السجل
      </button>

      <button class="btn btn-outline-secondary rounded-3" onclick="markAttendance('P')">
        <i class="fa-solid fa-user-check"></i>
        حاضر
      </button>
      <button class="btn btn-outline-warning rounded-3" onclick="markAttendance('L')">
        <i class="fa-solid fa-clock"></i>
        متأخر
      </button>
      <button class="btn btn-outline-info rounded-3" onclick="markAttendance('E')">
        <i class="fa-solid fa-hand"></i>
        معتذر
      </button>
      <button class="btn btn-outline-danger rounded-3" onclick="markAttendance('A')">
        <i class="fa-solid fa-user-xmark"></i>
        غائب
      </button>
    </div>
  `;
}

function renderSections() {
  const wrap = document.getElementById('sectionsWrap');

  if (!currentStudent) {
    wrap.innerHTML = '';
    return;
  }

  if (!currentSections.length) {
    wrap.innerHTML = `<div class="col-12"><div class="alert alert-light border rounded-4">لا توجد مقاطع محفوظة بعد</div></div>`;
    return;
  }

  wrap.innerHTML = currentSections.map(section => {
    const stateClass = section.p === 1 ? 'passed' : 'failed';
    const scoreClass = section.p === 1 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
    const requireFailReason = currentSettingsMap.requireFailReason === 'true';

    return `
      <div class="col-xl-4 col-lg-6">
        <div class="section-card ${stateClass} p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="fw-bold">المقطع ${section.s}</div>
            <div class="score-badge ${scoreClass}">
              ${section.f}
            </div>
          </div>

          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small">الدرجة الأصلية</label>
              <input type="number" class="form-control rounded-3" min="0" max="10" step="0.5"
                value="${section.b}" onchange="updateSectionField(${section.s}, 'b', this.value)">
            </div>
            <div class="col-6">
              <label class="form-label small">التاريخ</label>
              <input type="text" class="form-control rounded-3" value="${section.d || Helpers.formatDateCode()}"
                onchange="updateSectionField(${section.s}, 'd', this.value)">
            </div>
          </div>

          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small">الأخطاء</label>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary counter-btn" type="button" onclick="changeCounter(${section.s}, 'm', -1)">-</button>
                <input type="number" class="form-control text-center rounded-3" min="0"
                  value="${section.m}" onchange="updateSectionField(${section.s}, 'm', this.value)">
                <button class="btn btn-outline-secondary counter-btn" type="button" onclick="changeCounter(${section.s}, 'm', 1)">+</button>
              </div>
            </div>

            <div class="col-6">
              <label class="form-label small">التنبيهات</label>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary counter-btn" type="button" onclick="changeCounter(${section.s}, 'w', -1)">-</button>
                <input type="number" class="form-control text-center rounded-3" min="0"
                  value="${section.w}" onchange="updateSectionField(${section.s}, 'w', this.value)">
                <button class="btn btn-outline-secondary counter-btn" type="button" onclick="changeCounter(${section.s}, 'w', 1)">+</button>
              </div>
            </div>
          </div>

          <div class="mb-2">
            <label class="form-label small">سبب الرسوب</label>
            <select class="form-select rounded-3" onchange="updateSectionField(${section.s}, 'r', this.value)">
              <option value="">بدون</option>
              ${Object.entries(APP_CONFIG.CODES.FAIL_REASONS).map(([code, label]) =>
                `<option value="${code}" ${section.r === code ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
            ${requireFailReason && section.p === 0 ? `<div class="small text-danger mt-1">سبب الرسوب مطلوب لهذا المقطع</div>` : ''}
          </div>

          <div class="mb-3">
            <label class="form-label small">ملاحظة مختصرة</label>
            <input type="text" maxlength="120" class="form-control rounded-3"
              value="${escapeHtmlAttr(section.n || '')}"
              onchange="updateSectionField(${section.s}, 'n', this.value)">
          </div>

          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-primary rounded-3" type="button" onclick="recalculateSection(${section.s})">
              إعادة حساب
            </button>
            ${currentSettingsMap.showDeleteSectionButton === 'true' ? `
              <button class="btn btn-sm btn-outline-danger rounded-3" type="button" onclick="deleteSection(${section.s})">
                حذف
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addNewSection() {
  if (!currentStudent) return;

  const used = currentSections.map(x => x.s);
  let nextSection = 1;
  while (used.includes(nextSection) && nextSection <= 60) nextSection++;

  if (nextSection > 60) {
    Helpers.alert('warning', 'تم الوصول للحد الأعلى', 'لا يمكن إضافة أكثر من 60 مقطعًا');
    return;
  }

  currentSections.push({
    s: nextSection,
    b: 10,
    m: 0,
    w: 0,
    f: getFinalScore(10, 0, 0),
    p: isPassed(getFinalScore(10, 0, 0)) ? 1 : 0,
    r: '',
    n: '',
    d: Helpers.formatDateCode()
  });

  currentSections.sort((a, b) => a.s - b.s);
  renderStudentPanel();
  renderSections();
}

function updateSectionField(sectionNumber, field, value) {
  const section = currentSections.find(x => x.s === sectionNumber);
  if (!section) return;

  if (['b', 'm', 'w'].includes(field)) {
    section[field] = Number(value || 0);
  } else {
    section[field] = value;
  }

  section.f = getFinalScore(section.b, section.m, section.w);
  section.p = isPassed(section.f) ? 1 : 0;

  if (section.p === 1) {
    section.r = '';
  }

  renderStudentPanel();
  renderSections();
}

function changeCounter(sectionNumber, field, delta) {
  const section = currentSections.find(x => x.s === sectionNumber);
  if (!section) return;
  section[field] = Math.max(0, Number(section[field] || 0) + delta);
  section.f = getFinalScore(section.b, section.m, section.w);
  section.p = isPassed(section.f) ? 1 : 0;
  if (section.p === 1) section.r = '';
  renderStudentPanel();
  renderSections();
}

function recalculateSection(sectionNumber) {
  const section = currentSections.find(x => x.s === sectionNumber);
  if (!section) return;
  section.f = getFinalScore(section.b, section.m, section.w);
  section.p = isPassed(section.f) ? 1 : 0;
  if (section.p === 1) section.r = '';
  renderStudentPanel();
  renderSections();
}

async function deleteSection(sectionNumber) {
  const c = await Helpers.confirm('حذف المقطع', `هل تريد حذف المقطع ${sectionNumber}؟`, 'نعم، حذف');
  if (!c.isConfirmed) return;

  currentSections = currentSections.filter(x => x.s !== sectionNumber);
  renderStudentPanel();
  renderSections();
}

function getFinalScore(base, mistakes, warnings) {
  const mistakeDeduction = Number(currentSettingsMap.mistakeDeduction || 1);
  const warningDeduction = Number(currentSettingsMap.warningDeduction || 0.5);
  const finalScore = Number(base) - (Number(mistakes) * mistakeDeduction) - (Number(warnings) * warningDeduction);
  return Number(Math.max(finalScore, 0).toFixed(2));
}

function isPassed(finalScore) {
  const passingScore = Number(currentSettingsMap.passingScorePerSection || 8);
  return Number(finalScore) >= passingScore;
}

async function saveAllSections() {
  if (!currentStudent) return;

  if (currentSettingsMap.lockFullFile === 'true') {
    await Helpers.alert('warning', 'الملف مقفل', 'تم منع الحفظ لأن الملف مقفل حسب الإعدادات');
    return;
  }

  const invalidFail = currentSections.find(x => x.p === 0 && currentSettingsMap.requireFailReason === 'true' && !x.r);
  if (invalidFail) {
    await Helpers.alert('warning', 'سبب الرسوب مطلوب', `المقطع ${invalidFail.s} راسب ويجب تحديد سبب الرسوب`);
    return;
  }

  if (currentRecord && currentSettingsMap.editSectionsCode) {
    const result = await Swal.fire({
      title: 'رمز تعديل المقاطع',
      input: 'password',
      inputPlaceholder: 'أدخل الرمز',
      showCancelButton: true,
      confirmButtonText: 'متابعة',
      cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    if ((result.value || '') !== currentSettingsMap.editSectionsCode) {
      await Helpers.alert('error', 'رمز غير صحيح', 'تعذر اعتماد التعديل');
      return;
    }
  }

  Helpers.showLoader('جاري حفظ السجل...');
  try {
    const ds = currentSections.length;
    const ps = currentSections.filter(x => x.p === 1).length;
    const fs = currentSections.filter(x => x.p === 0).length;
    const rs = Math.max(60 - ds, 0);

    const payload = {
      organization_id: currentOrganizationId,
      student_id: currentStudent.id,
      notes: '',
      sections_json: currentSections,
      ds,
      ps,
      fs,
      rs
    };

    if (currentRecord?.id) {
      const { error } = await sb
        .from(APP_CONFIG.TABLES.RECORDS)
        .update(payload)
        .eq('id', currentRecord.id);

      if (error) throw error;
    } else {
      const { error } = await sb
        .from(APP_CONFIG.TABLES.RECORDS)
        .insert([payload]);

      if (error) throw error;
    }

    Helpers.toast('success', 'تم حفظ السجل بنجاح');
    await loadStudentData();
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'تعذر حفظ السجل', err.message || 'حدث خطأ');
  } finally {
    Helpers.hideLoader();
  }
}

async function markAttendance(statusCode) {
  if (!currentStudent) return;

  Helpers.showLoader('جاري حفظ الحضور...');
  try {
    const payload = {
      organization_id: currentOrganizationId,
      attendance_date: new Date().toISOString().slice(0, 10),
      halaqa_name: currentStudent.halaqa || '',
      student_id: currentStudent.id,
      student_name: currentStudent.name,
      status: statusCode
    };

    const { error } = await sb
      .from(APP_CONFIG.TABLES.ATTENDANCE)
      .insert([payload]);

    if (error) throw error;

    Helpers.toast('success', `تم تسجيل الحالة: ${APP_CONFIG.CODES.ATTENDANCE[statusCode]}`);
  } catch (err) {
    console.error(err);
    Helpers.alert('error', 'تعذر حفظ الحضور', err.message || 'حدث خطأ');
  } finally {
    Helpers.hideLoader();
  }
}

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtmlAttr(text = '') {
  return escapeHtml(text);
}
