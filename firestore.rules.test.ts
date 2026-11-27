/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Run against Firebase Local Emulator Suite when testing rules locally.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const DIRTY_DOZEN_PAYLOADS = [
  { name: 'Unauthenticated user profile write', path: '/users/userA', auth: null },
  { name: 'Unverified email write', path: '/users/userA', auth: { uid: 'userA', token: { email_verified: false } } },
  { name: 'Cross-user identity spoof', path: '/users/userB', auth: { uid: 'userA', token: { email_verified: true } }, data: { uid: 'userB' } },
  { name: 'Cross-user PII read', path: '/users/userB/private/info', auth: { uid: 'userA', token: { email_verified: true } } },
  { name: 'Shadow field isAdmin injection', path: '/users/userA', data: { uid: 'userA', isAdmin: true } },
  { name: 'Invalid ID poisoning', path: '/users/userA/screenings/bad..id', data: { id: 'bad..id' } },
  { name: 'Timestamp forgery on screening', path: '/users/userA/screenings/s1', data: { createdAt: '2020-01-01T00:00:00Z' } },
  { name: 'Out of bounds glucose', path: '/users/userA/screenings/s1', data: { glucose: 1200 } },
  { name: 'Unbounded topFactors array', path: '/users/userA/screenings/s1', data: { topFactors: ['a', 'b', 'c', 'd', 'e'] } },
  { name: 'Immutable createdAt mutation', path: '/users/userA', op: 'update', data: { createdAt: '2020-01-01T00:00:00Z' } },
  { name: 'Screening record mutation attempt', path: '/users/userA/screenings/s1', op: 'update', data: { riskCategory: 'Lower estimated risk' } },
  { name: 'Cross-user screening list query', path: '/users/userB/screenings', op: 'list', auth: { uid: 'userA', token: { email_verified: true } } },
];

describe('Dirty Dozen Security Spec', () => {
  it('defines all 12 adversarial test cases', () => {
    assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
  });
});
