import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshotInput, requestIdentity } from '../src/lib/input.ts';

test('normalizes a bare public hostname and trims optional fields', () => {
  const result = normalizeSnapshotInput({
    name: '  Acme HVAC  ',
    url: 'acme.example',
    city: ' Plano, TX ',
    vertical: 'hvac',
  });
  assert.deepEqual(result, {
    ok: true,
    input: {
      name: 'Acme HVAC',
      url: 'https://acme.example/',
      city: 'Plano, TX',
      vertical: 'hvac',
    },
  });
});

test('rejects invalid names, protocols, verticals, and credentials', () => {
  for (const body of [
    { name: 'A', url: 'https://acme.example' },
    { name: 'Acme', url: 'ftp://acme.example' },
    { name: 'Acme', url: 'https://user:pass@acme.example' },
    { name: 'Acme', url: 'https://acme.example', vertical: 'unknown' },
  ]) {
    assert.equal(normalizeSnapshotInput(body).ok, false);
  }
});

test('rejects local and private network targets', () => {
  for (const url of [
    'http://localhost:8787',
    'http://service.local',
    'http://127.0.0.1',
    'http://10.0.0.2',
    'http://169.254.169.254',
    'http://172.20.0.1',
    'http://192.168.1.1',
    'http://[::1]',
  ]) {
    assert.equal(normalizeSnapshotInput({ name: 'Acme', url }).ok, false, url);
  }
});

test('allows a public IPv4 target', () => {
  assert.equal(normalizeSnapshotInput({ name: 'Acme', url: 'https://8.8.8.8' }).ok, true);
});

test('request identity uses the Cloudflare header without adapter-only context access', () => {
  const withHeader = new Request('https://app.example', {
    headers: { 'cf-connecting-ip': '203.0.113.4' },
  });
  assert.equal(requestIdentity(withHeader), '203.0.113.4');
  assert.equal(requestIdentity(new Request('https://app.example')), 'unknown-client');
});
