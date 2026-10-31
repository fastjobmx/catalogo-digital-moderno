import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031201412 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor_profile" add column if not exists "rubro" text null, add column if not exists "city" text null, add column if not exists "instagram" text null, add column if not exists "business_hours" text null, add column if not exists "delivery_time" text null, add column if not exists "image_ratio" text not null default '1:1', add column if not exists "banner_blur" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor_profile" drop column if exists "rubro", drop column if exists "city", drop column if exists "instagram", drop column if exists "business_hours", drop column if exists "delivery_time", drop column if exists "image_ratio", drop column if exists "banner_blur";`);
  }

}
