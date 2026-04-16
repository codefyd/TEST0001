const APP_CONFIG = {
  APP_NAME: 'برنامج السرد',
  APP_VERSION: '1.0.0',
  APP_DIR: 'rtl',
  APP_LANG: 'ar',

  SUPABASE_URL: 'https://tnqaklfrrmfqcfxxnqav.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_RDnIbvVvBnapkxUAhIMXsg_Wb5ffz9B',

  ROUTES: {
    REQUEST: 'index.html',
    ADMIN_REQUESTS: 'admin-requests.html',
    LISTENER: 'listener.html'
  },

  TABLES: {
    PLATFORM_SETTINGS: 'platform_settings',
    ORGANIZATIONS: 'organizations',
    ORGANIZATION_REQUESTS: 'organization_requests',
    ORGANIZATION_ACCESS_LINKS: 'organization_access_links',
    USER_PROFILES: 'user_profiles',
    ORGANIZATION_MEMBERS: 'organization_members',
    SETTINGS: 'settings',
    TRACK_SETTINGS: 'track_settings',
    HALAQAS: 'halaqas',
    STUDENTS: 'students',
    RECORDS: 'records',
    ATTENDANCE: 'attendance',
    LOOKUP_LOGS: 'lookup_logs',
    GUIDE_ENTRIES: 'guide_entries',
    FAIL_REASON_CODES: 'fail_reason_codes'
  },

  CODES: {
    REQUEST_STATUS: {
      P: 'قيد الانتظار',
      A: 'مقبول',
      R: 'مرفوض',
      S: 'تم إرسال الرابط'
    },
    ATTENDANCE: {
      P: 'حاضر',
      L: 'متأخر',
      E: 'معتذر',
      A: 'غائب'
    },
    FAIL_REASONS: {
      H1: 'ضعف حفظ',
      H2: 'كثرة تردد',
      H3: 'أخطاء متكررة',
      H4: 'عدم إتقان',
      H5: 'انقطاع',
      OT: 'أخرى'
    },
    WEEKDAY: {
      1: 'الأحد',
      2: 'الاثنين',
      3: 'الثلاثاء',
      4: 'الأربعاء',
      5: 'الخميس',
      6: 'الجمعة',
      7: 'السبت'
    }
  },

  SETTINGS_KEYS: [
    'partsDivisions',
    'mistakeDeduction',
    'warningDeduction',
    'passingScorePerSection',
    'settingsLockCode',
    'editSectionsCode',
    'showTrackInSelection',
    'hideHalaqasAndUseTracksOnly',
    'activeTrackForSelection',
    'requireFailReason',
    'whatsappTemplate',
    'showReportsButton',
    'lockFullFile',
    'showDeleteSectionButton'
  ]
};

window.APP_CONFIG = APP_CONFIG;
