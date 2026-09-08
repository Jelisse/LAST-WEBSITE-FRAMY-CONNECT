import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
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
