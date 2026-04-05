import request from 'supertest'
import app from '../../app'

export async function getOwnerToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'owner@test.com', credential: 'Test@1234' })
  if (!res.body.token) throw new Error(`Owner login failed: ${JSON.stringify(res.body)}`)
  return res.body.token as string
}

export async function getManagerToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'manager@test.com', credential: 'Manager@1234' })
  if (!res.body.token) throw new Error(`Manager login failed: ${JSON.stringify(res.body)}`)
  return res.body.token as string
}

export async function getStaffToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: '7777777777', credential: '1111' })
  if (!res.body.token) throw new Error(`Staff login failed: ${JSON.stringify(res.body)}`)
  return res.body.token as string
}
