import { Entity, EntityRepositoryType, Property, OneToMany, Collection, BeforeUpdate, EventArgs, BeforeCreate } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Image } from '../image/entity.js'
import { DocumentRepository } from './repository.js'
import { processHtml } from '../common/htmlProcessor.js'
import { JSDOM } from 'jsdom'

@Entity({ repository: () => DocumentRepository })
export class Document extends BaseEntity<'text'> {
  [EntityRepositoryType]?: DocumentRepository

  @Property({ columnType: 'text', nullable: true })
  html!: string

  @OneToMany(() => Image, (image) => image.document, { orphanRemoval: true })
  images: Collection<Image> = new Collection<Image>(this)

  private originalHtml?: string;

  @BeforeCreate()
  @BeforeUpdate()
  async processHtmlContent({ em, changeSet }: EventArgs<Document>) {
    // Skip processing if html is empty or hasn't changed
    if (!this.html || (changeSet && !changeSet.payload.html) || this.html === this.originalHtml) {
      return;
    }
    
    // Process the HTML content
    const { sanitizedHtml, images } = await processHtml(this.html, em, { document: this });
    
    // Update the HTML with sanitized version
    this.html = sanitizedHtml;
    
    // Add new images to the collection
    for (const image of images) {
      this.images.add(image);
    }
    
    // When updating, we need to check for images to remove
    if (changeSet) {
      // Store the original images for comparison
      const originalImageIds = new Set(this.images.getItems().map(image => image.id));
      
      // Identify images that are no longer referenced in the HTML
      const currentImagesInHtml = new Set<string>();
      const dom = new JSDOM(sanitizedHtml);
      const imgElements = dom.window.document.getElementsByTagName('img');
      
      for (const img of Array.from(imgElements)) {
        const src = img.getAttribute('src');
        if (src?.startsWith('/api/images/')) {
          const imageId = src.replace('/api/images/', '');
          currentImagesInHtml.add(imageId);
        }
      }
      
      // Remove images that are no longer in the HTML
      for (const image of [...this.images.getItems()]) {
        if (image.id && !currentImagesInHtml.has(String(image.id)) && originalImageIds.has(image.id)) {
          this.images.remove(image);
        }
      }
    }
    
    // Save the current HTML to detect changes in future
    this.originalHtml = sanitizedHtml;
  }
}
