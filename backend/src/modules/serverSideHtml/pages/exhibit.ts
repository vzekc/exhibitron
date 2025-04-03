import { GeneratePageHtmlContext, makeExhibitorLink, transformImageUrls } from '../utils.js'
import { ensureTransformedImage } from '../../image/transformation.js'

export const exhibitHtml = async ({ db, gifSuffix }: GeneratePageHtmlContext, id: number) => {
  const exhibit = await db.exhibit.findOneOrFail(
    { id },
    { populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image', 'table'] },
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
    descriptionHtml = await transformImageUrls(exhibit.description.html, db, 'htmlLarge', gifSuffix)
  }
  if (exhibit.descriptionExtension?.html) {
    descriptionHtml += await transformImageUrls(
      exhibit.descriptionExtension.html,
      db,
      'htmlLarge',
      gifSuffix,
    )
  }

  let mainImageHtml = ''
  if (exhibit.mainImage) {
    const dimensions = await ensureTransformedImage(
      db.em,
      exhibit.mainImage.image.id,
      `htmlSmall${gifSuffix}`,
    )
    mainImageHtml = `<img src="/api/images/${exhibit.mainImage.image.slug}/htmlSmall${gifSuffix}" width="${dimensions.width}" height="${dimensions.height}" alt="${exhibit.title}" />`
  }

  return `<div>
    <h2>${exhibit.title}</h2>
    <p>${makeExhibitorLink(exhibit.exhibitor)}</p>
    ${exhibit.table ? '<p>Tisch ' + exhibit.table.number + '</p>' : ''}
    ${mainImageHtml}
    ${(exhibit.attributes?.length && makeExhibitAttributesTable()) || ''}
    <p>${descriptionHtml}</p>
  </div>`
}
