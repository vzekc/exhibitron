import { initORM } from '../db.js'
import { getImageDimensions } from '../modules/image/utils.js'
import { RequestContext } from '@mikro-orm/core'

async function main() {
  console.log('Initializing database connection...')
  const db = await initORM({ allowGlobalContext: true })

  try {
    // Create a global context for the entire operation
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          console.log('Loading all image storage objects...')
          const images = await db.image.findAll()
          console.log(`Found ${images.length} images`)

          let processed = 0
          let errors = 0

          for (const image of images) {
            try {
              console.log(`Processing image ${image.id} (${image.filename})...`)

              // Explicitly load the lazy data field
              await db.em.populate(image, ['data'])

              const dimensions = await getImageDimensions(image.data)

              // Update dimensions if they've changed
              if (image.width !== dimensions.width || image.height !== dimensions.height) {
                image.width = dimensions.width
                image.height = dimensions.height
                await db.em.flush()
                console.log(`Updated dimensions to ${dimensions.width}x${dimensions.height}`)
              } else {
                console.log('Dimensions unchanged')
              }
              processed++
            } catch (error) {
              console.error(`Error processing image ${image.id} (${image.filename}):`, error)
              errors++
            }
          }

          console.log('\nSummary:')
          console.log(`Total images processed: ${processed}`)
          console.log(`Errors: ${errors}`)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  } finally {
    await db.orm.close()
  }
}

main().catch(console.error)
