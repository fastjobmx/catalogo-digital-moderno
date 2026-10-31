import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031192759 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "whatsapp_outbox" ("id" text not null, "message_id" text not null, "to" text not null, "template" text not null, "payload" jsonb not null, "status" text check ("status" in ('sent', 'failed')) not null, "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "whatsapp_outbox_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_outbox_deleted_at" ON "whatsapp_outbox" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_outbox_to" ON "whatsapp_outbox" ("to") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_outbox_message_id" ON "whatsapp_outbox" ("message_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "whatsapp_outbox" cascade;`);
  }

}
