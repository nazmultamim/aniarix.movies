import assert from 'node:assert/strict';
import test from 'node:test';
import { canChangeAdminTargetRole, isAdminProfile } from '../src/lib/security/admin-access.mjs';

const adminId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';

test('regular users cannot pass the admin route/action role check', () => {
  assert.equal(isAdminProfile({ id: adminId, role: 'user' }, adminId), false);
  assert.equal(canChangeAdminTargetRole({ id: adminId, role: 'user' }, adminId, otherId), false);
});

test('admin identity must match the authenticated user', () => {
  assert.equal(isAdminProfile({ id: otherId, role: 'admin' }, adminId), false);
});

test('an authenticated admin may manage another account but cannot change their own role', () => {
  const profile = { id: adminId, role: 'admin' };
  assert.equal(canChangeAdminTargetRole(profile, adminId, otherId), true);
  assert.equal(canChangeAdminTargetRole(profile, adminId, adminId), false);
});
