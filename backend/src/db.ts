import { defineConfig, EntityManager, EntityRepository, MikroORM, Options } from '@mikro-orm/sqlite';
import { Article } from './modules/article/article.entity.js';
import { User } from './modules/user/user.entity.js';
import { Tag } from './modules/article/tag.entity.js';
import { Comment } from './modules/article/comment.entity.js';
import { UserRepository } from './modules/user/user.repository.js';
import { ArticleRepository } from './modules/article/article.repository.js';
import config from './mikro-orm.config.js';

export interface Services {
  orm: MikroORM;
  em: EntityManager;
  article: ArticleRepository;
  user: UserRepository;
  tag: EntityRepository<Tag>;
  comment: EntityRepository<Comment>;
}

let cache: Services;

export async function initORM(options?: Options): Promise<Services> {
  if (cache) {
    return cache;
  }

  const orm = await MikroORM.init({ ...defineConfig(config), ...options });

  // save to cache before returning
  return cache = {
    orm,
    em: orm.em,
    article: orm.em.getRepository(Article),
    user: orm.em.getRepository(User),
    tag: orm.em.getRepository(Tag),
    comment: orm.em.getRepository(Comment),
  };
}
