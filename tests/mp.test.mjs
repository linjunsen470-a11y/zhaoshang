import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apiUrl,
  failureScreenshot,
  startE2E,
  stopE2E,
  recordStage,
  waitForData,
  waitForPage,
} from './e2e/harness.mjs';

test('mini-program leasing smoke journey', { timeout: 120_000 }, async () => {
  let context;
  let leadId = '';
  let authToken = '';
  try {
    const projectsResponse = await fetch(`${apiUrl}/projects?public=true`);
    const onlineProject = (await projectsResponse.json()).docs.find(project => project.status === 'online');
    assert.ok(onlineProject, 'backend must provide an online project');
    const projectId = String(onlineProject.id);
    context = await startE2E({ initialPath: `/pages/apply/apply?projectId=${projectId}` });
    const { miniProgram } = context;
    const apply = await waitForPage(miniProgram, 'pages/apply/apply');
    await waitForData(apply, 'projectTitle', Boolean, 20_000);
    const title = String(await apply.data('projectTitle'));
    console.log('[smoke] application form loaded');
    recordStage(context, 'application-form-loaded');
    await apply.callMethod('onSubmitForm');
    assert.equal((await miniProgram.currentPage()).path, 'pages/apply/apply', 'empty form must not submit');

    await (await apply.$('.e2e-phone-input')).input('12812345678');
    await apply.callMethod('onSubmitForm');
    assert.equal((await miniProgram.currentPage()).path, 'pages/apply/apply', 'invalid phone must not submit');

    await (await apply.$('.e2e-phone-input')).input('13812345678');
    const remark = `smoke-${Date.now()}`;
    await (await apply.$('.e2e-remark-input')).input(remark);
    await apply.callMethod('onSubmitForm');
    assert.equal((await miniProgram.currentPage()).path, 'pages/apply/apply', 'privacy consent must be required');
    await apply.callMethod('onTogglePrivacy');
    await apply.callMethod('onSubmitForm');
    await waitForData(apply, 'submitting', value => value === false, 20_000);

    let success;
    const currentAfterSubmit = await miniProgram.currentPage();
    if (currentAfterSubmit.path === 'pages/success/success') {
      success = currentAfterSubmit;
      leadId = String(success.query.leadId || '');
    } else {
      authToken = await miniProgram.evaluate(() => wx.getStorageSync('authToken'));
      const response = await fetch(`${apiUrl}/leads`, { headers: { Authorization: `Bearer ${authToken}` } });
      assert.equal(response.status, 200);
      const created = (await response.json()).find(lead => lead.remark === remark);
      leadId = String(created?.id || '');
      success = null;
    }
    assert.ok(leadId, 'successful POST /leads must propagate the created leadId');
    console.log(`[smoke] created lead ${leadId}`);
    recordStage(context, `lead-created:${leadId}`);
    if (!authToken) authToken = await miniProgram.evaluate(() => wx.getStorageSync('authToken'));
    const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
    const createdResponse = await fetch(`${apiUrl}/leads/${leadId}`, { headers });
    assert.equal(createdResponse.status, 200);
    const createdLead = await createdResponse.json();
    assert.equal(createdLead.projectTitle, title);
    assert.equal(createdLead.remark, remark);
    assert.equal(createdLead.name, '');
    console.log('[smoke] created lead verified through API');
    recordStage(context, 'created-lead-verified');

    const updatedRemark = `updated-${Date.now()}`;
    const updateResponse = await fetch(`${apiUrl}/leads/${leadId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: createdLead.name,
        phone: createdLead.phone,
        businessType: createdLead.businessType,
        budgetRange: createdLead.budgetRange,
        regionPreference: createdLead.regionPreference,
        projectId: createdLead.projectId,
        attachments: createdLead.attachments.map(file => file.id),
        remark: updatedRemark,
      }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).remark, updatedRemark);
    console.log('[smoke] edit persisted');
    recordStage(context, 'edit-persisted');

    const deleteResponse = await fetch(`${apiUrl}/leads/${leadId}`, { method: 'DELETE', headers });
    assert.equal(deleteResponse.status, 200);
    const remainingResponse = await fetch(`${apiUrl}/leads`, { headers });
    assert.equal(remainingResponse.status, 200);
    assert.equal((await remainingResponse.json()).some(lead => String(lead.id) === leadId), false);
    console.log('[smoke] exact lead deleted');
    recordStage(context, 'lead-deleted');
    leadId = '';

    assert.equal(context.runtimeErrors.length, 0, 'mini-program emitted runtime exceptions');
  } catch (error) {
    if (context?.miniProgram) await failureScreenshot(context.miniProgram, 'leasing-smoke-failure').catch(() => {});
    throw error;
  } finally {
    if (context?.miniProgram) {
      if (leadId && authToken) {
        await fetch(`${apiUrl}/leads/${leadId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }).catch(() => {});
      }
    }
    await stopE2E(context).catch(() => {});
  }
});
