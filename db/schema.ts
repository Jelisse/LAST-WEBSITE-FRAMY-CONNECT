import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const productCatalog = sqliteTable('product_catalog', {
  id: text('id').primaryKey(),
  dataJson: text('data_json').notNull(),
  version: integer('version').notNull().default(1),
  updatedBy: text('updated_by').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const catalogManagers = sqliteTable('catalog_managers', {
  userId: text('user_id').primaryKey(),
});
export const sandboxMemberships = sqliteTable('sandbox_memberships', {
  ownerId: text('owner_id').primaryKey(),
  planId: text('plan_id').notNull(),
  termsJson: text('terms_json'),
  version: integer('version').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
  trialStartedAt: text('trial_started_at'),
  trialExpiresAt: text('trial_expires_at'),
});
export const profiles = sqliteTable('profiles', {
  ownerId: text('owner_id').primaryKey(),
  username: text('username').notNull().unique(),
  draftJson: text('draft_json').notNull(),
  publishedJson: text('published_json'),
  version: integer('version').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const sandboxOrders = sqliteTable(
  'sandbox_orders',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    dataJson: text('data_json').notNull(),
    version: integer('version').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('orders_owner').on(t.ownerId)],
);
export const sandboxEvents = sqliteTable(
  'sandbox_events',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    orderId: text('order_id').notNull(),
    action: text('action').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('events_owner_time').on(t.ownerId, t.createdAt)],
);

export const orderManagers = sqliteTable('order_managers', {
  userId: text('user_id').primaryKey(),
});

export const managerRecords = sqliteTable('manager_records', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  dataJson: text('data_json').notNull(),
  version: integer('version').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const stockMovements = sqliteTable('stock_movements', {
  agentId: text('agent_id').notNull().default(''),
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  actor: text('actor').notNull(),
  createdAt: text('created_at').notNull(),
});
export const managerAudit = sqliteTable('manager_audit', {
  id: text('id').primaryKey(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  subject: text('subject').notNull(),
  createdAt: text('created_at').notNull(),
});

export const authAccounts = sqliteTable('auth_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  active: integer('active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  version: integer('version').notNull().default(1),
});
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => authAccounts.id),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('auth_sessions_account').on(t.accountId)],
);
export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const productOptions = sqliteTable('product_options', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  quantity: integer('quantity').notNull(),
  enabled: integer('enabled').notNull().default(1),
  version: integer('version').notNull().default(0),
});
export const authInvitations = sqliteTable(
  'auth_invitations',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => authAccounts.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => authAccounts.id),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('invitations_account').on(t.accountId)],
);
export const paymentRecords = sqliteTable(
  'payment_records',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => sandboxOrders.id),
    kind: text('kind').notNull(),
    providerReference: text('provider_reference').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    verifiedBy: text('verified_by')
      .notNull()
      .references(() => authAccounts.id),
    verifiedAt: text('verified_at').notNull(),
  },
  (t) => [
    uniqueIndex('payment_reference_unique').on(t.kind, t.providerReference),
    uniqueIndex('payment_order_kind_unique').on(t.orderId, t.kind),
  ],
);
export const storedAssets = sqliteTable(
  'stored_assets',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => authAccounts.id),
    kind: text('kind').notNull(),
    bytes: integer('bytes').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('assets_owner').on(t.ownerId)],
);

export const productVisits = sqliteTable(
  'product_visits',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    day: text('day').notNull(),
  },
  (t) => [index('product_visits_day_product').on(t.day, t.productId)],
);
export const agentApplications = sqliteTable(
  'agent_applications',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .unique()
      .references(() => authAccounts.id),
    dataJson: text('data_json').notNull(),
    status: text('status').notNull().default('DRAFT'),
    version: integer('version').notNull().default(1),
    reviewNote: text('review_note').notNull().default(''),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('applications_status_updated').on(t.status, t.updatedAt)],
);
export const applicationFiles = sqliteTable(
  'application_files',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => agentApplications.id),
    kind: text('kind').notNull(),
  },
  (t) => [uniqueIndex('application_files_kind').on(t.applicationId, t.kind)],
);
