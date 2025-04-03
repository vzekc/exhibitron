import { GeneratePageHtmlContext, makeExhibitorLink, transformImageUrls } from '../utils.js'
import { ensureTransformedImage } from '../../image/transformation.js'

export const exhibitHtml = async ({ db }: GeneratePageHtmlContext, id: number) => {
  const exhibit = await db.exhibit.findOneOrFail(
    { id },
    { populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image'] },
  )

  const makeExhibitAttributesTable = () => {
    return `<h2>Datenblatt</h2>
    <table>
      ${exhibit.attributes
        ?.map((attribute) => {
          const [name, value] = attribute
          return `<tr>
          <td>${name}</td>
          <td>${value}</td>
        </tr>`
        })
        .join('')}
    </table>`
  }

  let descriptionHtml = ''
  if (exhibit.description?.html) {
    descriptionHtml = await transformImageUrls(exhibit.description.html, db, 'htmlLarge')
  }
  if (exhibit.descriptionExtension?.html) {
    descriptionHtml += await transformImageUrls(exhibit.descriptionExtension.html, db, 'htmlLarge')
  }

  let mainImageHtml = ''
  if (exhibit.mainImage) {
    const dimensions = await ensureTransformedImage(db.em, exhibit.mainImage.image.id, 'htmlSmall')
    mainImageHtml = `<img src="/api/images/${exhibit.mainImage.image.slug}/htmlSmall" width="${dimensions.width}" height="${dimensions.height}" alt="${exhibit.title}" />`
  }

  return `<div>
    <h2>${exhibit.title}</h2>
    <p>${makeExhibitorLink(exhibit.exhibitor)}</p>
    ${exhibit.table?.number ? '<p>Tisch ' + exhibit.table.number + '</p>' : ''}
    ${mainImageHtml}
    ${(exhibit.attributes?.length && makeExhibitAttributesTable()) || ''}
    <p>${descriptionHtml}</p>
  </div>`
}
