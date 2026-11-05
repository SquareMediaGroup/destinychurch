// A pretend Destiny One admin API for filming (capture/d1-tutorial.cjs). The Destiny One pages are
// the real /admin, but their /api/admin/destiny-one/* calls are answered here, in the browser,
// from invented people, so no database functions have to be rebuilt and nothing reaches the app's
// real data. It keeps state, so approving, inviting and creating groups show up straight after.
// Every person here is made up.
const crypto = require('crypto');

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 5, 10);
const iso = (d, h = 10) => new Date(NOW + d * DAY + (h - 10) * 3_600_000).toISOString();
const id = () => crypto.randomUUID();

function makeState() {
  const person = (name, email, o = {}) => ({
    id: id(), displayName: name, email, status: 'active', roles: [], isAdult: true, adultOn: '2000-01-01',
    declaredAdult: null, requestNote: null, requestSubmittedAt: null, verifiedAt: iso(-40), verificationSource: 'invite',
    churchsuiteLinked: false, createdAt: iso(-40), communityCount: 1, groupCount: 0, postingRestrictedUntil: null, ...o,
  });
  const members = [
    person('Grace Wilson', 'grace.wilson@example.com', { roles: ['admin', 'senior_leader'], verificationSource: 'admin' }),
    person('Ben Hughes', 'ben.hughes@example.com', { roles: ['cg_leader'] }),
    person('Priya Shah', 'priya.shah@example.com'),
    person('Daniel Osei', 'daniel.osei@example.com'),
    person('Hannah Clarke', 'hannah.clarke@example.com', { roles: ['cg_leader'] }),
    person('Leo Martins', 'leo.martins@example.com', { isAdult: false, adultOn: '2029-03-14' }),
    person('Maya Clarke', 'maya.clarke@example.com', { isAdult: false, adultOn: '2030-07-02' }),
    person('Tom Reid', 'tom.reid@example.com', { status: 'suspended' }),
    // Waiting for approval.
    person('Abigail Turner', 'abigail.turner@example.com', {
      status: 'pending', isAdult: false, adultOn: null, verifiedAt: null, verificationSource: null, communityCount: 0,
      declaredAdult: true, requestNote: 'I serve on the welcome team on Sundays.', requestSubmittedAt: iso(-1, 19),
    }),
    person('Joel Adeyemi', 'joel.adeyemi@example.com', {
      status: 'pending', isAdult: false, adultOn: null, verifiedAt: null, verificationSource: null, communityCount: 0,
      declaredAdult: false, requestNote: 'My mum said to ask. I go to Destiny Youth.', requestSubmittedAt: iso(-2, 17),
    }),
  ];
  const byName = (n) => members.find((m) => m.displayName === n);
  const church = { id: id(), name: 'Destiny Church', description: 'Everyone at Destiny', archived: false, createdAt: iso(-60) };
  const youth = { id: id(), name: 'Destiny Youth', description: 'Youth leaders and young people', archived: false, createdAt: iso(-50) };
  const communities = [church, youth];
  // community id → [{ memberId, role, joinedAt }]
  const cm = {
    [church.id]: members.filter((m) => m.status === 'active').map((m) => ({ memberId: m.id, role: m.roles.includes('admin') ? 'admin' : 'member', joinedAt: iso(-40) })),
    [youth.id]: ['Grace Wilson', 'Hannah Clarke', 'Leo Martins', 'Maya Clarke'].map((n) => ({ memberId: byName(n).id, role: n === 'Grace Wilson' ? 'admin' : 'member', joinedAt: iso(-30) })),
  };
  const group = (c, kind, name, department, ids, o = {}) => ({
    id: id(), communityId: c.id, kind, name, department, description: null, state: 'active', freezeKind: null, frozenReason: null,
    createdAt: iso(-30), members: ids.map((n, i) => ({ memberId: byName(n).id, role: i === 0 ? 'admin' : 'member', joinedAt: iso(-30) })), ...o,
  });
  const groups = [
    group(church, 'announcements', 'Announcements', null, ['Grace Wilson', 'Ben Hughes', 'Priya Shah', 'Daniel Osei', 'Hannah Clarke', 'Leo Martins', 'Maya Clarke']),
    group(church, 'group', 'Sunday Worship Team', 'Worship', ['Ben Hughes', 'Priya Shah', 'Daniel Osei', 'Hannah Clarke']),
    group(church, 'group', 'Welcome Team', 'Welcome', ['Grace Wilson', 'Daniel Osei', 'Leo Martins']),
    group(church, 'group', 'Media Team', 'Media', ['Priya Shah', 'Leo Martins'], {
      state: 'frozen', freezeKind: 'auto', frozenReason: 'Paused: needs at least 3 people, including 2 adults.',
    }),
    group(youth, 'announcements', 'Announcements', null, ['Grace Wilson', 'Hannah Clarke', 'Leo Martins', 'Maya Clarke']),
    group(youth, 'group', 'Youth Leaders', 'Youth', ['Hannah Clarke', 'Grace Wilson', 'Ben Hughes']),
  ];
  const invite = (name, email, o = {}) => ({
    id: id(), email, displayName: name, isAdult: true, roles: [], communityIds: [church.id], status: 'pending',
    expiresAt: iso(10), lastSentAt: iso(-4), acceptedAt: null, createdAt: iso(-4), ...o,
  });
  const invites = [
    invite('Samuel King', 'samuel.king@example.com', { roles: ['cg_leader'] }),
    invite('Ruth Bello', 'ruth.bello@example.com', { createdAt: iso(-20), lastSentAt: iso(-20), expiresAt: iso(-6), status: 'expired' }),
    invite('Daniel Osei', 'daniel.osei@example.com', { status: 'accepted', acceptedAt: iso(-38), createdAt: iso(-41) }),
  ];
  const feedback = [
    { id: id(), kind: 'problem', body: 'Photos I send in Welcome Team sometimes stay on "Sending" until I close the app.', status: 'new', memberId: byName('Daniel Osei').id, memberName: 'Daniel Osei', appVersion: '1.4.0', platform: 'ios', osVersion: '19.1', device: 'iPhone 15', errorId: null, createdAt: iso(-1, 21), doneAt: null },
    { id: id(), kind: 'idea', body: 'Could we pin the rota to the top of the worship group?', status: 'new', memberId: byName('Ben Hughes').id, memberName: 'Ben Hughes', appVersion: '1.4.0', platform: 'android', osVersion: '16', device: 'Pixel 8', errorId: null, createdAt: iso(-3, 8), doneAt: null },
    { id: id(), kind: 'idea', body: 'A dark mode would be lovely for evening services.', status: 'done', memberId: byName('Priya Shah').id, memberName: 'Priya Shah', appVersion: '1.3.2', platform: 'ios', osVersion: '19.0', device: 'iPhone 13', errorId: null, createdAt: iso(-20), doneAt: iso(-9) },
  ];
  const settings = {
    allowAccessRequests: true, inviteExpiryDays: 14, minBuildIos: 41, minBuildAndroid: 41, forceUpdateMessage: null,
    maintenanceMessage: null, latestVersion: '1.4.0', latestVersionNotes: 'Reply to a message\nPolls in groups', retentionDays: 365,
    churchSuiteConfigured: false,
  };
  return { members, communities, cm, groups, invites, feedback, settings };
}

function install(ctx) {
  const s = makeState();
  const m = (mid) => s.members.find((x) => x.id === mid);
  const active = (list) => list.filter((x) => m(x.memberId)?.status === 'active');
  const person = (x) => ({ id: x.memberId, displayName: m(x.memberId).displayName, isAdult: m(x.memberId).isAdult, role: x.role, joinedAt: x.joinedAt });
  const people = (list) => active(list).map(person).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const settle = (g) => {
    if (g.kind !== 'group' || g.state === 'archived' || g.freezeKind === 'manual') return;
    const live = active(g.members);
    const ok = live.length >= 3 && live.filter((x) => m(x.memberId).isAdult).length >= 2;
    Object.assign(g, ok ? { state: 'active', freezeKind: null, frozenReason: null } : { state: 'frozen', freezeKind: 'auto', frozenReason: 'Paused: needs at least 3 people, including 2 adults.' });
  };
  const toGroup = (g) => {
    const live = active(g.members);
    const { members: _drop, ...rest } = g;
    return { ...rest, memberCount: live.length, adultCount: live.filter((x) => m(x.memberId).isAdult).length };
  };
  const toCommunity = (c) => {
    const own = s.groups.filter((g) => g.communityId === c.id);
    return { ...c, memberCount: active(s.cm[c.id] ?? []).length, groupCount: own.filter((g) => g.kind === 'group' && g.state !== 'archived').length, pausedGroupCount: own.filter((g) => g.state === 'frozen').length };
  };
  const counts = (mem) => ({
    ...mem,
    communityCount: s.communities.filter((c) => (s.cm[c.id] ?? []).some((x) => x.memberId === mem.id)).length,
    groupCount: s.groups.filter((g) => g.kind === 'group' && g.members.some((x) => x.memberId === mem.id)).length,
  });
  const joinCommunity = (cid, mid, role = 'member') => {
    s.cm[cid] = s.cm[cid] ?? [];
    if (!s.cm[cid].some((x) => x.memberId === mid)) s.cm[cid].push({ memberId: mid, role, joinedAt: new Date().toISOString() });
    const ann = s.groups.find((g) => g.communityId === cid && g.kind === 'announcements');
    if (ann && !ann.members.some((x) => x.memberId === mid)) ann.members.push({ memberId: mid, role, joinedAt: new Date().toISOString() });
  };

  return ctx.route('**/api/admin/destiny-one/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace('/api/admin/destiny-one', '').split('/').filter(Boolean);
    const method = req.method();
    const body = (() => { try { return req.postDataJSON() ?? {}; } catch { return {}; } })();
    const json = (data, status = 200) => route.fulfill({ status, json: data });

    switch (p[0]) {
      case 'whoami':
        return json({ destinyOneAdmin: true, safeguardingAdmin: false, transcriptReader: false, superAdmin: false });
      case 'overview': {
        const ms = s.members;
        const gs = s.groups.filter((g) => !s.communities.find((c) => c.id === g.communityId)?.archived);
        return json({
          activeMembers: ms.filter((x) => x.status === 'active').length,
          pendingRequests: ms.filter((x) => x.status === 'pending' && x.requestSubmittedAt).length,
          unsubmittedSignIns: 1,
          suspended: ms.filter((x) => x.status === 'suspended').length,
          openInvites: s.invites.filter((i) => i.status === 'pending').length,
          communities: s.communities.filter((c) => !c.archived).length,
          groups: gs.filter((g) => g.kind === 'group' && g.state !== 'archived').length,
          pausedGroups: gs.filter((g) => g.state === 'frozen').length,
        });
      }
      case 'settings':
        if (method === 'PATCH') Object.assign(s.settings, body);
        return json(s.settings);
      case 'churchsuite':
        return json([]);
      case 'feedback': {
        if (p[1] && method === 'PATCH') {
          const f = s.feedback.find((x) => x.id === p[1]);
          Object.assign(f, { status: body.status, doneAt: body.status === 'done' ? new Date().toISOString() : null });
          return json(f);
        }
        return json([...s.feedback].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      case 'members': {
        if (!p[1]) {
          const st = url.searchParams.get('status');
          return json(s.members.filter((x) => !st || x.status === st).map(counts).sort((a, b) => a.displayName.localeCompare(b.displayName)));
        }
        const mem = m(p[1]);
        if (!mem) return json({ error: 'Not found' }, 404);
        if (p[2] === 'approve') {
          Object.assign(mem, {
            status: 'active', isAdult: body.adult, adultOn: body.adult ? '2000-01-01' : '2030-01-01',
            verifiedAt: new Date().toISOString(), verificationSource: 'admin', displayName: body.displayName ?? mem.displayName,
          });
          for (const cid of body.communityIds ?? []) joinCommunity(cid, mem.id);
          return json({ member: counts(mem) });
        }
        if (p[2] === 'decline') {
          mem.status = 'suspended';
          return json({ ok: true });
        }
        if (method === 'GET') {
          return json({
            member: counts(mem),
            communities: s.communities.flatMap((c) => (s.cm[c.id] ?? []).filter((x) => x.memberId === mem.id).map((x) => ({ id: c.id, name: c.name, role: x.role }))),
            groups: s.groups.flatMap((g) => g.members.filter((x) => x.memberId === mem.id).map((x) => ({ id: g.id, name: g.name, kind: g.kind, state: g.state, communityId: g.communityId, role: x.role }))),
          });
        }
        if (method === 'PATCH') {
          if (body.displayName) mem.displayName = body.displayName;
          if (body.roles) mem.roles = body.roles;
          if (body.status) mem.status = body.status;
          if (body.age) Object.assign(mem, { isAdult: body.age.adult });
          s.groups.forEach(settle);
          return json({ member: counts(mem) });
        }
        if (method === 'DELETE') {
          s.members.splice(s.members.indexOf(mem), 1);
          return json({ ok: true });
        }
        break;
      }
      case 'invites': {
        if (p[1]) {
          const inv = s.invites.find((x) => x.id === p[1]);
          if (body.action === 'revoke') inv.status = 'revoked';
          else Object.assign(inv, { status: 'pending', lastSentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 14 * DAY).toISOString() });
          return json(inv);
        }
        if (method === 'POST') {
          for (const i of body.invites ?? []) {
            s.invites.push({ id: id(), email: i.email, displayName: i.name, isAdult: i.adult, roles: i.roles, communityIds: i.communityIds, status: 'pending', expiresAt: new Date(Date.now() + 14 * DAY).toISOString(), lastSentAt: new Date().toISOString(), acceptedAt: null, createdAt: new Date().toISOString() });
          }
          return json({ created: (body.invites ?? []).length, failed: [] }, 201);
        }
        return json([...s.invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      case 'communities': {
        if (!p[1]) {
          if (method === 'POST') {
            const c = { id: id(), name: body.name, description: body.description ?? null, archived: false, createdAt: new Date().toISOString() };
            s.communities.push(c);
            s.cm[c.id] = [];
            s.groups.push({ id: id(), communityId: c.id, kind: 'announcements', name: 'Announcements', department: null, description: null, state: 'frozen', freezeKind: 'auto', frozenReason: 'Paused until 3 people, including 2 adults, have joined.', createdAt: c.createdAt, members: [] });
            for (const a of body.adminIds ?? []) joinCommunity(c.id, a, 'admin');
            return json({ id: c.id }, 201);
          }
          return json(s.communities.map(toCommunity).sort((a, b) => a.name.localeCompare(b.name)));
        }
        const c = s.communities.find((x) => x.id === p[1]);
        if (!c) return json({ error: 'Not found' }, 404);
        if (p[2] === 'members') {
          if (method === 'POST') for (const mid of body.memberIds ?? []) joinCommunity(c.id, mid, body.role);
          if (method === 'PATCH') s.cm[c.id].find((x) => x.memberId === body.memberId).role = body.role;
          if (method === 'DELETE') s.cm[c.id] = s.cm[c.id].filter((x) => x.memberId !== body.memberId);
          return json({ ok: true });
        }
        if (p[2] === 'groups' && method === 'POST') {
          const g = { id: id(), communityId: c.id, kind: 'group', name: body.name, department: body.department, description: null, state: 'active', freezeKind: null, frozenReason: null, createdAt: new Date().toISOString(), members: (body.memberIds ?? []).map((mid) => ({ memberId: mid, role: (body.adminIds ?? []).includes(mid) ? 'admin' : 'member', joinedAt: new Date().toISOString() })) };
          settle(g);
          s.groups.push(g);
          return json({ id: g.id }, 201);
        }
        if (method === 'PATCH') {
          if (body.name) c.name = body.name;
          if ('description' in body) c.description = body.description;
          if ('archived' in body) c.archived = body.archived;
        }
        return json({
          community: toCommunity(c),
          groups: s.groups.filter((g) => g.communityId === c.id).map(toGroup),
          members: people(s.cm[c.id] ?? []),
        });
      }
      case 'groups': {
        const g = s.groups.find((x) => x.id === p[1]);
        if (!g) return json({ error: 'Not found' }, 404);
        if (p[2] === 'members') {
          if (method === 'POST') for (const mid of body.memberIds ?? []) if (!g.members.some((x) => x.memberId === mid)) g.members.push({ memberId: mid, role: body.role, joinedAt: new Date().toISOString() });
          if (method === 'PATCH') g.members.find((x) => x.memberId === body.memberId).role = body.role;
          if (method === 'DELETE') g.members = g.members.filter((x) => x.memberId !== body.memberId);
          settle(g);
          return json({ ok: true });
        }
        if (method === 'PATCH') {
          if (body.name) g.name = body.name;
          if ('department' in body) g.department = body.department;
          if ('archived' in body) g.state = body.archived ? 'archived' : 'active';
          settle(g);
        }
        return json({ group: toGroup(g), communityName: s.communities.find((c) => c.id === g.communityId).name, members: people(g.members) });
      }
    }
    return json({ error: `Not in the filming copy: ${method} ${url.pathname}` }, 404);
  });
}

module.exports = { install };
