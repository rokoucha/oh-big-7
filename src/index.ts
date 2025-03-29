import { AutoRouter } from 'itty-router'
import { genereteIcalFromReserves } from './ical'
import { scrape } from './scrape'

const router = AutoRouter()

router.get('/', () => {
  return new Response('', {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
})

router.get('/ical', async (req, env: Env) => {
  const credentials = req.query?.credentials
  if (typeof credentials !== 'string') {
    return new Response('Missing credentials', { status: 401 })
  }

  const [user, pass] = atob(decodeURIComponent(credentials)).trim().split(':')
  if (!user || !pass) {
    return new Response('Invalid credentials', { status: 401 })
  }

  const reserves = await scrape(user, pass, env.START_KEY, env.DOMAIN)

  const ical = genereteIcalFromReserves(reserves, env.LOCATION)

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar',
    },
  })
})

export default router satisfies ExportedHandler<Env>
