import { Migration } from '@mikro-orm/migrations';

export class Migration20250215091116 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "tag" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(20) not null);`);

    this.addSql(`create table "user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "full_name" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "bio" text not null default '', "social" jsonb null);`);

    this.addSql(`create table "article" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "slug" varchar(255) not null, "title" varchar(255) not null, "description" varchar(1000) not null, "text" text not null, "author_id" int not null);`);
    this.addSql(`alter table "article" add constraint "article_slug_unique" unique ("slug");`);
    this.addSql(`create index "article_title_index" on "article" ("title");`);

    this.addSql(`create table "comment" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "text" varchar(1000) not null, "article_id" int not null, "author_id" int not null);`);

    this.addSql(`create table "article_tags" ("article_id" int not null, "tag_id" int not null, constraint "article_tags_pkey" primary key ("article_id", "tag_id"));`);

    this.addSql(`alter table "article" add constraint "article_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "comment" add constraint "comment_article_id_foreign" foreign key ("article_id") references "article" ("id") on update cascade;`);
    this.addSql(`alter table "comment" add constraint "comment_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "article_tags" add constraint "article_tags_article_id_foreign" foreign key ("article_id") references "article" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "article_tags" add constraint "article_tags_tag_id_foreign" foreign key ("tag_id") references "tag" ("id") on update cascade on delete cascade;`);
  }

}
