import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031183843 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor_profile" drop constraint if exists "vendor_profile_seller_id_unique";`);
    this.addSql(`alter table if exists "order_request" drop constraint if exists "order_request_seller_id_idempotency_key_unique";`);
    this.addSql(`create table if not exists "catalog_import" ("id" text not null, "seller_id" text not null, "file_name" text not null, "status" text check ("status" in ('preview', 'queued', 'processing', 'completed', 'failed')) not null default 'preview', "rows" jsonb not null default '{"items":[]}', "total_rows" integer not null default 0, "processed_rows" integer not null default 0, "created_count" integer not null default 0, "updated_count" integer not null default 0, "failed_count" integer not null default 0, "errors" jsonb not null default '{"items":[]}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "catalog_import_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_import_deleted_at" ON "catalog_import" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_import_seller_id" ON "catalog_import" ("seller_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_request" ("id" text not null, "display_id" serial, "seller_id" text not null, "status" text check ("status" in ('pendiente_confirmacion', 'confirmado', 'entregado', 'cancelado')) not null default 'pendiente_confirmacion', "customer_name" text not null, "customer_phone" text not null, "customer_address" text null, "notes" text null, "currency_code" text not null, "total" numeric not null, "idempotency_key" text not null, "raw_total" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_request_deleted_at" ON "order_request" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_request_seller_id_status" ON "order_request" ("seller_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_request_customer_phone_created_at" ON "order_request" ("customer_phone", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_order_request_seller_id_idempotency_key_unique" ON "order_request" ("seller_id", "idempotency_key") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "order_request_item" ("id" text not null, "offer_id" text not null, "product_id" text not null, "sku" text not null, "title" text not null, "size" text null, "image_url" text null, "quantity" integer not null, "unit_price" numeric not null, "line_total" numeric not null, "order_id" text not null, "raw_unit_price" jsonb not null, "raw_line_total" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_request_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_request_item_order_id" ON "order_request_item" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_request_item_deleted_at" ON "order_request_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor_profile" ("id" text not null, "seller_id" text not null, "primary_color" text not null default '#111827', "secondary_color" text not null default '#F59E0B', "whatsapp_phone" text null, "stock_location_id" text null, "payment_methods" jsonb not null default '{"items":[]}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_profile_deleted_at" ON "vendor_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_profile_seller_id_unique" ON "vendor_profile" ("seller_id") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "whatsapp_message" ("id" text not null, "recipient" text check ("recipient" in ('vendor', 'customer')) not null, "to_phone" text not null, "template" text not null, "params" jsonb not null, "body" text not null, "status" text check ("status" in ('queued', 'retrying', 'sent', 'delivered', 'read', 'failed')) not null default 'queued', "provider" text null, "provider_message_id" text null, "attempts" integer not null default 0, "last_error" text null, "order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "whatsapp_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_message_order_id" ON "whatsapp_message" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_message_deleted_at" ON "whatsapp_message" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_message_provider_message_id" ON "whatsapp_message" ("provider_message_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_message_status" ON "whatsapp_message" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "order_request_item" add constraint "order_request_item_order_id_foreign" foreign key ("order_id") references "order_request" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "whatsapp_message" add constraint "whatsapp_message_order_id_foreign" foreign key ("order_id") references "order_request" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "order_request_item" drop constraint if exists "order_request_item_order_id_foreign";`);

    this.addSql(`alter table if exists "whatsapp_message" drop constraint if exists "whatsapp_message_order_id_foreign";`);

    this.addSql(`drop table if exists "catalog_import" cascade;`);

    this.addSql(`drop table if exists "order_request" cascade;`);

    this.addSql(`drop table if exists "order_request_item" cascade;`);

    this.addSql(`drop table if exists "vendor_profile" cascade;`);

    this.addSql(`drop table if exists "whatsapp_message" cascade;`);
  }

}
