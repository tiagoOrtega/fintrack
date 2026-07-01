const SHEETS_BASE = 'https://sheets.googleapis.com/v4'

async function request<T>(url: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 401) throw new Error('TOKEN_EXPIRED')
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(body.error?.message ?? `Sheets API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

interface SpreadsheetResponse {
  spreadsheetId: string
  spreadsheetUrl: string
}

export async function createSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  const result = await request<SpreadsheetResponse>(
    `${SHEETS_BASE}/spreadsheets`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title: 'FinTrack Data' },
        sheets: [
          { properties: { title: 'Investments', index: 0 } },
          { properties: { title: 'Expenses',    index: 1 } },
          { properties: { title: 'Settings',    index: 2 } },
        ],
      }),
    }
  )
  return { id: result.spreadsheetId, url: result.spreadsheetUrl }
}

export async function batchUpdateValues(
  accessToken:   string,
  spreadsheetId: string,
  ranges:        { range: string; values: string[][] }[]
): Promise<void> {
  await request(
    `${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: ranges }),
    }
  )
}
