import { GeneratePageHtmlContext } from '../utils.js'

export const exhibitorListHtml = async ({ db, exhibition }: GeneratePageHtmlContext) => {
  const exhibitors = await db.exhibitor.findAll({
    where: { exhibition },
    populate: ['user', 'exhibits'],
  })

  const sortedExhibitors = [...exhibitors].sort((a, b) =>
    a.user.fullName.localeCompare(b.user.fullName, undefined, { sensitivity: 'base' }),
  )

  const style = `
    <style>
      @font-face {
        font-family: 'Lato';
        src: url('/fonts/Lato-Regular.woff2') format('woff2'),
             url('/fonts/Lato-Regular.woff') format('woff');
        font-weight: 400;
        font-style: normal;
      }
      
      @font-face {
        font-family: 'Lato';
        src: url('/fonts/Lato-Bold.woff2') format('woff2'),
             url('/fonts/Lato-Bold.woff') format('woff');
        font-weight: 700;
        font-style: normal;
      }
      
      body {
        font-family: 'Lato', sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        line-height: 1.6;
      }
      
      .exhibitor {
        margin-bottom: 10px;
        padding: 5px;
        padding-left: 20px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }
      
      .exhibitor h2 {
        margin-top: 0;
        margin: 0;
        color: #333;
      }
      
      .exhibits-list {
        list-style-type: none;
        padding-left: 20px;
      }
      
      .exhibits-list li {
        margin: 0;
        position: relative;
      }
      
      .exhibits-list li:before {
        content: "-";
        color: #666;
        position: absolute;
        left: -15px;
      }
    </style>
  `

  const exhibitorsList = sortedExhibitors
    .map((exhibitor) => {
      const sortedExhibits = [...exhibitor.exhibits].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      )

      const exhibitsList = sortedExhibits.length
        ? `<ul class="exhibits-list">
            ${sortedExhibits.map((exhibit) => `<li>${exhibit.title}</li>`).join('')}
           </ul>`
        : ''

      return `
        <div class="exhibitor">
          <h2>${exhibitor.user.fullName}${exhibitor.user.nickname ? ' (' + exhibitor.user.nickname + ')' : ''}</h2>
          ${exhibitsList}
        </div>
      `
    })
    .join('')

  return `${style}${exhibitorsList}`
}
