import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSession,
  destroySession,
  hashPassword,
  hashToken,
  rotateSession,
  userFromToken,
  validName,
  verifyPassword,
} from './auth.ts'
import { openDb } from './db.ts'

const HALF_LIFE_MS = 1000 * 60 * 60 * 24 * 16

function seedUser() {
  const db = openDb(':memory:')
  const { hash, salt } = hashPassword('correct-horse')
  db.prepare(
    `INSERT INTO users (id, name, password_hash, password_salt, remix_points, kind, created_at, bio, scene)
     VALUES (?, ?, ?, ?, 0, 'human', ?, '', '')`,
  ).run('u1', 'maker', hash, salt, Date.now())
  return db
}

test('hashPassword then verifyPassword accepts only the same secret', () => {
  const { hash, salt } = hashPassword('correct-horse')
  assert.equal(verifyPassword('correct-horse', hash, salt), true)
  assert.equal(verifyPassword('wrong-horse', hash, salt), false)
  assert.equal(verifyPassword('correct-horse', '00', salt), false)
})

test('hashToken is stable and newToken-sized values hash differently', () => {
  assert.equal(hashToken('abc'), hashToken('abc'))
  assert.notEqual(hashToken('abc'), hashToken('abd'))
})

test('validName allows the published handle charset only', () => {
  assert.equal(validName('ab'), true)
  assert.equal(validName('maker_01'), true)
  assert.equal(validName('a'), false)
  assert.equal(validName('HasCaps'), false)
  assert.equal(validName('has space'), false)
})

test('createSession retires every other session for that user', () => {
  const db = seedUser()
  const first = createSession(db, 'u1')
  assert.equal(userFromToken(db, first)?.name, 'maker')
  const second = createSession(db, 'u1')
  assert.equal(userFromToken(db, first), undefined)
  assert.equal(userFromToken(db, second)?.id, 'u1')
})

test('rotateSession is a no-op until the session is past halfway', () => {
  const db = seedUser()
  const token = createSession(db, 'u1')
  assert.equal(rotateSession(db, token), undefined)
  assert.equal(rotateSession(db, undefined), undefined)
  const next = rotateSession(db, token, Date.now() + HALF_LIFE_MS)
  assert.ok(next)
  assert.notEqual(next, token)
  assert.equal(userFromToken(db, token), undefined)
  assert.equal(userFromToken(db, next)?.name, 'maker')
})

test('destroySession and a missing token do not resolve a user', () => {
  const db = seedUser()
  const token = createSession(db, 'u1')
  destroySession(db, token)
  assert.equal(userFromToken(db, token), undefined)
  assert.equal(userFromToken(db, undefined), undefined)
})
