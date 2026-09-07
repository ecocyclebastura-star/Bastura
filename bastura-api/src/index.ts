import { Hono } from 'hono'
import { sql } from './model/connection'
import authApp  from './routes/auth-routes'
import tscApp from './routes/tsc-routes'
import ancApp from './routes/anc-routes'
import eduApp from './routes/edu-routes'
import updateApp from './routes/update-routes'
import profileApp from './routes/profile-routes'
import catalogApp from './routes/catalog-route'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/hello', async (c) => {
  try {
    const result = await sql`SELECT * FROM hello`
    
    return c.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    return c.json({
      success: false,
      message: error.message
    }, 500)
  }
})

app.route('/api/v1/auth', authApp)
app.route('/api/v1/transaction', tscApp)
app.route('/api/v1/announcements', ancApp)
app.route('/api/v1/education', eduApp)
app.route('/api/v1/updates', updateApp)
app.route('/api/v1/users/account', profileApp)
app.route('/api/v1/waste/', catalogApp)

export default app