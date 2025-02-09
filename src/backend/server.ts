import { app } from './app'

const port = parseInt(process.env.PORT || '3000')

app.listen(port, async () => {
  console.log(`Server running on port ${port}`)
})
