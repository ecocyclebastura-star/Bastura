import { Hono } from 'hono'
import postgres from 'postgres'
import authApp  from './routes/auth-routes'

const app = new Hono()

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
})

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
export default app
