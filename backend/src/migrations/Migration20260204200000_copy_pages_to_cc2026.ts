import { Migration } from '@mikro-orm/migrations'

export class Migration20260204200000_copy_pages_to_cc2026 extends Migration {
  override async up(): Promise<void> {
    // Drop the redundant global unique constraint on page.key
    // (the composite unique on exhibition_id + key is sufficient)
    await this.execute(`ALTER TABLE "page" DROP CONSTRAINT IF EXISTS "page_key_unique"`)

    // Get cc2025 and cc2026 exhibition IDs
    const exhibitions = await this.execute(`
      SELECT id, key FROM exhibition WHERE key IN ('cc2025', 'cc2026')
    `)
    const cc2025Id = exhibitions.find((e) => e.key === 'cc2025')?.id
    const cc2026Id = exhibitions.find((e) => e.key === 'cc2026')?.id

    if (!cc2025Id || !cc2026Id) {
      throw new Error('Could not find cc2025 or cc2026 exhibition')
    }

    // Get all pages from cc2025
    const pages = await this.execute(
      `
      SELECT p.id, p.key, p.title, p.content_id
      FROM page p
      WHERE p.exhibition_id = ?
    `,
      [cc2025Id],
    )

    for (const page of pages) {
      // Copy the document if it exists
      let newContentId = null
      if (page.content_id) {
        // Get the original document
        const [doc] = await this.execute(
          `
          SELECT html FROM document WHERE id = ?
        `,
          [page.content_id],
        )

        if (doc) {
          // Create a new document with the same content
          const [newDoc] = await this.execute(
            `
            INSERT INTO document (html, created_at, updated_at)
            VALUES (?, now(), now())
            RETURNING id
          `,
            [doc.html],
          )
          newContentId = newDoc.id

          // Copy any document images
          const images = await this.execute(
            `
            SELECT di.image_id FROM document_image di WHERE di.document_id = ?
          `,
            [page.content_id],
          )

          for (const img of images) {
            // Get the original image storage
            const [origImage] = await this.execute(
              `
              SELECT slug, mime_type FROM image_storage WHERE id = ?
            `,
              [img.image_id],
            )

            if (origImage) {
              // Create new image storage (copy the reference)
              const [newImage] = await this.execute(
                `
                INSERT INTO image_storage (slug, mime_type, created_at, updated_at)
                VALUES (?, ?, now(), now())
                RETURNING id
              `,
                [origImage.slug, origImage.mime_type],
              )

              // Copy image variants
              const variants = await this.execute(
                `
                SELECT variant, data, mime_type FROM image_variant WHERE image_id = ?
              `,
                [img.image_id],
              )

              for (const variant of variants) {
                await this.execute(
                  `
                  INSERT INTO image_variant (image_id, variant, data, mime_type)
                  VALUES (?, ?, ?, ?)
                `,
                  [newImage.id, variant.variant, variant.data, variant.mime_type],
                )
              }

              // Link to new document
              await this.execute(
                `
                INSERT INTO document_image (document_id, image_id, created_at, updated_at)
                VALUES (?, ?, now(), now())
              `,
                [newContentId, newImage.id],
              )
            }
          }
        }
      }

      // Adjust title for home page
      let newTitle = page.title
      if (page.key === 'home') {
        newTitle = 'Classic Computing 2026 in Celle'
      }

      // Create the new page for cc2026
      await this.execute(
        `
        INSERT INTO page (key, title, exhibition_id, content_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, now(), now())
      `,
        [page.key, newTitle, cc2026Id, newContentId],
      )
    }
  }

  override async down(): Promise<void> {
    // Get cc2026 exhibition ID
    const [cc2026] = await this.execute(`
      SELECT id FROM exhibition WHERE key = 'cc2026'
    `)

    if (cc2026) {
      // Get all pages for cc2026 with their content IDs
      const pages = await this.execute(
        `
        SELECT p.id, p.content_id FROM page p WHERE p.exhibition_id = ?
      `,
        [cc2026.id],
      )

      for (const page of pages) {
        if (page.content_id) {
          // Delete document images and their image storage
          const docImages = await this.execute(
            `
            SELECT di.id, di.image_id FROM document_image di WHERE di.document_id = ?
          `,
            [page.content_id],
          )

          for (const di of docImages) {
            // Delete image variants
            await this.execute(`DELETE FROM image_variant WHERE image_id = ?`, [di.image_id])
            // Delete document image link
            await this.execute(`DELETE FROM document_image WHERE id = ?`, [di.id])
            // Delete image storage
            await this.execute(`DELETE FROM image_storage WHERE id = ?`, [di.image_id])
          }

          // Delete the document
          await this.execute(`DELETE FROM document WHERE id = ?`, [page.content_id])
        }
      }

      // Delete all pages for cc2026
      await this.execute(`DELETE FROM page WHERE exhibition_id = ?`, [cc2026.id])
    }
  }
}
