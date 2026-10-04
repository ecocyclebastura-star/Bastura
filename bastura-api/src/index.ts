import { Hono } from 'hono'
import { sql } from './model/connection'
import authApp  from './routes/auth-routes'
import tscApp from './routes/tsc-routes'
import ancApp from './routes/anc-routes'
import eduApp from './routes/edu-routes'
import updateApp from './routes/update-routes'
import profileApp from './routes/profile-routes'
import catalogApp from './routes/catalog-route'
import splitbillsApp from './routes/splitbills-routes'
import adminApp from './routes/admin-routes'
import depositApp from './routes/deposit-routes'
import komisiApp from './routes/komisi-routes'

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

app.route('/api/v1/admin', adminApp)
app.route('/api/v1/auth', authApp)
app.route('/api/v1/transaction', tscApp)
app.route('/api/v1/announcements', ancApp)
app.route('/api/v1/education', eduApp)
app.route('/api/v1/updates', updateApp)
app.route('/api/v1/users/account', profileApp)
app.route('/api/v1/waste/', catalogApp)
app.route('/api/v1/splitbills', splitbillsApp)
app.route('/api/v1/deposits', depositApp)
app.route('/api/v1/komisi', komisiApp)

export default app