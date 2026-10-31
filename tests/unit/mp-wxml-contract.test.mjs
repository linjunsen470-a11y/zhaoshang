import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('critical WXML controls retain their user event bindings', () => {
  assert.match(read('mp/pages/index/index.wxml'), /e2e-service-entry[^>]+wx:for="{{secondaryServices}}"/);
  assert.match(read('mp/pages/index/index.wxml'), /e2e-latest-card[^>]+bindtap="onProjectDetail"/);
  assert.match(read('mp/pages/index/index.wxml'), /e2e-search-button[^>]+bindtap="onSearch"/);
  assert.match(read('mp/pages/detail/detail.wxml'), /e2e-consult-button[^>]+bindtap="onGoToConsult"/);
  assert.match(read('mp/pages/apply/apply.wxml'), /e2e-submit-lead[^>]+bindtap="onSubmitForm"/);
  assert.match(read('mp/pages/success/success.wxml'), /e2e-view-leads[^>]+bindtap="onViewLeads"/);
  assert.match(read('mp/pages/leads/leads.wxml'), /e2e-edit-lead[^>]+bindtap="onEditLead"/);
  assert.match(read('mp/pages/leads/leads.wxml'), /e2e-delete-lead[^>]+bindtap="onDeleteLead"/);
});
