import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
  t,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { User } from '../user/user.entity.js'
import { Comment } from './comment.entity.js'
import { Tag } from './tag.entity.js'
import { ArticleRepository } from './article.repository.js'

function convertToSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

@Entity({ repository: () => ArticleRepository })
export class Article extends BaseEntity<'slug' | 'description'> {
  [EntityRepositoryType]?: ArticleRepository

  @Property({ unique: true })
  slug!: string

  @Property({ index: true })
  title!: string

  @Property({ length: 1000 })
  description!: string

  @Property({ type: t.text, lazy: true })
  text!: string

  @ManyToOne()
  author!: User

  @ManyToMany()
  tags = new Collection<Tag>(this)

  @OneToMany({ mappedBy: 'article', eager: true, orphanRemoval: true })
  comments = new Collection<Comment>(this)

  constructor(title: string, text: string, author: User) {
    super()
    this.title = title
    this.text = text
    this.author = author
    this.slug = convertToSlug(title)
    this.description = this.text.substring(0, 999) + '…'
  }
}
