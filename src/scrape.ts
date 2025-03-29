import { load } from 'cheerio'

const defaultHeaders = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-GB;q=0.7,en;q=0.3',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0',
}

export type Reserve = {
  from: Date
  to: Date
  dateText: string
  type: string
  slot: string
  timeText: string
  description: string
}

export async function scrape(
  user: string,
  pass: string,
  startKey: string,
  domain: string,
) {
  const startReferer = `https://${domain}/ZADFavo/Favorite.aspx?p=${startKey}`
  const startUrl = `https://${domain}/EGWWeb30/Api/Access/Navigate?p=${startKey}`

  const start = await fetch(startUrl, {
    headers: {
      ...defaultHeaders,
      Referer: startReferer,
    },
  })

  let cookie = start.headers.get('set-cookie')?.split(';').at(0)
  if (!cookie) {
    throw new Error('No cookie')
  }

  const $start = load(await start.text())

  const loginFormPath = $start('iframe').attr('src')
  if (!loginFormPath) {
    throw new Error('No login form path')
  }

  const loginFormUrl = new URL(loginFormPath, start.url).href

  const login = await fetch(loginFormUrl, {
    headers: {
      ...defaultHeaders,
      Referer: start.url,
      Cookie: cookie,
    },
  })

  const $login = load(await login.text())

  const formTarget = $login('form').attr('action')
  if (!formTarget) {
    throw new Error('No form target')
  }

  const inputs = Object.fromEntries(
    $login('form input')
      .toArray()
      .map((e) => ({
        type: e.attribs.type,
        name: e.attribs.name,
        value: e.attribs.value,
      }))
      .map((e) => [e.name, e.value ? decodeURIComponent(e.value) : '']),
  )

  const loginParams = new URLSearchParams()
  loginParams.set('__LASTFOCUS', inputs.__LASTFOCUS)
  loginParams.set('__VIEWSTATE', inputs.__VIEWSTATE)
  loginParams.set('__VIEWSTATEGENERATOR', inputs.__VIEWSTATEGENERATOR)
  loginParams.set('__EVENTVALIDATION', inputs.__EVENTVALIDATION)
  loginParams.set('ctl00$ctl03', '')
  loginParams.set('_x0_value', inputs._x0_value)
  loginParams.set('ctl00$MessageUpper$txtKyoushuuseiNO', user)
  loginParams.set('ctl00$MessageUpper$txtPassword', pass)
  loginParams.set('messageArea_messages', '[]')
  loginParams.set(
    'ctl00$Contents$btnAuthentication',
    inputs['ctl00$Contents$btnAuthentication'],
  )

  const getLoginToken = await fetch(new URL(formTarget, login.url), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Referer: login.url,
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: loginParams.toString(),
  })

  cookie = getLoginToken.headers.get('set-cookie')?.split(';').at(0)
  if (!cookie) {
    throw new Error('No cookie')
  }

  const tokenFormTarget = $login('form').attr('action')
  if (!tokenFormTarget) {
    throw new Error('No token form target')
  }

  const $loginToken = load(await getLoginToken.text())
  const loginToken = $loginToken('form input[name=ai]').attr('value')
  if (!loginToken) {
    throw new Error('No login token')
  }

  const tokenParams = new URLSearchParams()
  tokenParams.set('sb', 'Submit Query')
  tokenParams.set('ai', loginToken)

  const menu = await fetch(new URL(tokenFormTarget, getLoginToken.url), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Referer: getLoginToken.url,
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  })

  const $menu = load(await menu.text())

  const menuFormTarget = $menu('form').attr('action')
  if (!menuFormTarget) {
    throw new Error('No menu form target')
  }

  const reserveListParams = new URLSearchParams(
    $menu('form input')
      .toArray()
      .map((e) => ({
        type: e.attribs.type,
        name: e.attribs.name,
        value: e.attribs.value,
      }))
      .filter(
        (e) =>
          e.type !== 'submit' ||
          e.name === 'ctl00$MessageUpper$btnMenu_YoyakuItiran',
      )
      .map((e) => [e.name, e.value ?? '']),
  )
  reserveListParams.set('messageArea_messages', '[]')

  const reserveList = await fetch(new URL(menuFormTarget, menu.url), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Referer: menu.url,
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: reserveListParams.toString(),
  })

  const $reserveList = load(await reserveList.text())

  const reserveListTable = $reserveList('#lst_lc > div > div').toArray()

  const reserves: {
    from: Date
    to: Date
    dateText: string
    type: string
    slot: string
    timeText: string
    description: string
  }[] = []

  for (let i = 0; i < reserveListTable.length; i += 2) {
    const dateText = $reserveList('span.lbl', reserveListTable[i]).text()

    const [_, year, month, day] = [
      ...(dateText.match(/(\d{4})\/(\d{2})\/(\d{2})/) ?? []),
    ]

    const reservesElement = $reserveList(
      '.list-container .page .blocks',
      reserveListTable[i + 1],
    ).toArray()

    for (let j = 0; j < reservesElement.length; j += 2) {
      const timeText = $reserveList(reservesElement[j].children.at(2)).text()
      const [from, to] = timeText.split('～').map((t) => t.trim())

      reserves.push({
        from: new Date(`${year}-${month}-${day}T${from}:00+09:00`),
        to: new Date(`${year}-${month}-${day}T${to}:00+09:00`),
        dateText: dateText,
        type: $reserveList(reservesElement[j].children.at(0)).text(),
        slot: $reserveList(reservesElement[j].children.at(1)).text(),
        timeText,
        description: $reserveList(reservesElement[j + 1].children.at(1)).text(),
      })
    }
  }

  return reserves
}
