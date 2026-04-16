window.Guard = {
  async requireAuth(options = {}) {
    const session = await window.AuthService.getSession();
    if (!session) {
      window.location.href = options.redirect || 'index.html';
      return null;
    }
    return session;
  },

  async requirePlatformAdmin(options = {}) {
    await this.requireAuth(options);
    const profile = await window.AuthService.getMyProfile();
    if (!profile || profile.role !== 'PA') {
      await Helpers.alert('error', 'غير مصرح', 'هذه الصفحة مخصصة لإدارة المنصة فقط');
      window.location.href = options.redirect || 'index.html';
      return null;
    }
    return profile;
  },

  async requireOrganizationMember(options = {}) {
    await this.requireAuth(options);
    const memberships = await window.AuthService.getMyMemberships();
    if (!memberships.length) {
      await Helpers.alert('error', 'غير مصرح', 'لا توجد جهة مرتبطة بحسابك');
      window.location.href = options.redirect || 'index.html';
      return null;
    }
    return memberships;
  }
};
