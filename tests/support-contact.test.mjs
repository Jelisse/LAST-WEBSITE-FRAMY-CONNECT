import test from 'node:test';
import assert from 'node:assert/strict';
import { contactLinks, supportContacts, isDashboardSupportPath } from '../lib/support-contact.ts';

test('support routing uses known inboxes and never creates an external recipient from a message', () => {
 assert.equal(contactLinks('sales', 'Team quotation').email, supportContacts.sales);
 assert.equal(contactLinks('support', 'Profile help').email, supportContacts.email);
 assert.equal(contactLinks('partnerships', 'Collaboration').email, supportContacts.email);
 const link = new URL(contactLinks('support', 'Support', 'hello&bcc=other@example.com\nnext line', 'FC-OR-26-1234-5678').mailto);
 assert.equal(link.pathname, supportContacts.email);
 assert.equal(link.searchParams.has('bcc'), false);
 assert.match(link.searchParams.get('body'), /hello&bcc=other@example.com/);
 assert.match(link.searchParams.get('body'), /FC-OR-26-1234-5678/);
});

test('sales messages exclude an order reference left in the support form and messages are bounded', () => {
 const links = contactLinks('sales', 'Quote', 'x'.repeat(3000), 'PRIVATE-ORDER');
 const email = new URL(links.mailto);
 assert.ok(!email.searchParams.get('body').includes('PRIVATE-ORDER'));
 assert.equal(email.searchParams.get('body').length, 'Quote'.length + 2 + 1800);
 const whatsapp = new URL(links.whatsapp);
 assert.equal(whatsapp.hostname, 'wa.me');
 assert.equal(whatsapp.pathname, '/' + supportContacts.whatsapp);
 assert.equal(whatsapp.searchParams.get('text'), email.searchParams.get('body'));
});

test('in-place support is restricted to dashboard paths and excludes invitation and public profile pages', () => {
 for (const path of ['/dashboard', '/perfil', '/manager/pagamentos', '/cofounder', '/agent', '/corporativo', '/corporativo/cartoes', '/corporativo/integracoes']) assert.equal(isDashboardSupportPath(path), true, path);
 for (const path of ['/', '/contacto', '/ajuda', '/corporativo/aceitar', '/perfil-publico', '/angela_khossa', '/managerial', '/equipa/card']) assert.equal(isDashboardSupportPath(path), false, path);
});
