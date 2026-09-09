import assert from 'node:assert/strict';
import { plans } from '../lib/domain.ts';
const base = 'http://localhost:3000';
const signin = await fetch(base + '/signin-with-chatgpt?return_to=/dashboard', {
  redirect: 'manual',
});
assert.equal(signin.status, 302);
const cookie = signin.headers.get('set-cookie').split(';')[0];
const headers = { cookie, origin: base, 'Content-Type': 'application/json' };
const get = async () => {
  const r = await fetch(base + '/api/workspace', { headers: { cookie } });
  assert.equal(r.status, 200);
  return r.json();
};
const send = async (body, extra = {}) => {
  const r = await fetch(base + '/api/workspace', {
    method: 'POST',
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });
  const raw = await r.text();
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    result = { error: raw };
  }
  return { status: r.status, body: result };
};
const original = await get();
let savedProfileChanged = false;
try {
  const denied = await send(
    {
      action: 'activate-sandbox-plan',
      planId: 'organisation',
      version: original.membership.version,
    },
    { origin: 'https://untrusted.example' },
  );
  assert.equal(denied.status, 403);
  assert.equal(
    (
      await send({
        action: 'activate-sandbox-plan',
        planId: 'unknown',
        version: original.membership.version,
      })
    ).status,
    422,
  );
  // Only activate plans which can retain the existing local profile unchanged.
  for (const plan of plans) {
    if (
      (original.profile?.links?.length ?? 0) > plan.links ||
      (original.profile?.bio?.length ?? 0) > plan.bio ||
      original.published
    )
      continue;
    const before = await get();
    assert.equal(
      (
        await send({
          action: 'activate-sandbox-plan',
          planId: plan.id,
          version: before.membership.version,
        })
      ).status,
      200,
    );
    const after = await get();
    assert.equal(after.membership.planId, plan.id);
    assert.equal(after.membership.mode, 'sandbox');
    assert.equal(
      (
        await send({
          action: 'activate-sandbox-plan',
          planId: plan.id,
          version: before.membership.version,
        })
      ).status,
      409,
    );
    const profile = original.profile ?? {
      name: 'Plan Test',
      username: 'plan_test',
      title: '',
      website: '',
      email: '',
      phone: '',
      showEmail: false,
      showPhone: false,
    };
    const tooMany = {
      ...profile,
      links: Array(plan.links + 1).fill({
        label: 'Test',
        url: 'https://example.com',
      }),
      bio: '',
    };
    assert.equal(
      (
        await send({
          action: 'save-profile',
          profile: tooMany,
          version: after.profileVersion,
          planId: 'organisation',
        })
      ).status,
      422,
    );
  }
  // Exercise real link persistence only on the pre-existing labelled test draft.
  if (original.profile?.name === 'Perfil de Teste' && !original.published) {
    let state = await get();
    assert.equal(
      (
        await send({
          action: 'activate-sandbox-plan',
          planId: 'creator',
          version: state.membership.version,
        })
      ).status,
      200,
    );
    state = await get();
    const profile = {
      ...original.profile,
      bio: 'Plan flow test',
      links: Array.from({ length: 4 }, (_, i) => ({
        label: `Link ${i + 1}`,
        url: `https://example.com/${i + 1}`,
      })),
    };
    assert.equal(
      (
        await send({
          action: 'save-profile',
          profile,
          version: state.profileVersion,
        })
      ).status,
      200,
    );
    savedProfileChanged = true;
    state = await get();
    assert.deepEqual(state.profile.links, profile.links);
    assert.equal(
      (
        await send({
          action: 'activate-sandbox-plan',
          planId: 'individual',
          version: state.membership.version,
        })
      ).status,
      422,
    );
    assert.equal((await get()).profile.links.length, 4);
  }
  console.log(
    'PASS: plan persistence, invalid plans, CSRF, stale updates, server-side link allowances; labelled test drafts also exercise saved links and downgrade protection.',
  );
} finally {
  if (savedProfileChanged) {
    const state = await get();
    assert.equal(
      (
        await send({
          action: 'save-profile',
          profile: original.profile,
          version: state.profileVersion,
        })
      ).status,
      200,
    );
  }
  const state = await get();
  if (state.membership.planId !== original.membership.planId)
    assert.equal(
      (
        await send({
          action: 'activate-sandbox-plan',
          planId: original.membership.planId,
          version: state.membership.version,
        })
      ).status,
      200,
    );
}
