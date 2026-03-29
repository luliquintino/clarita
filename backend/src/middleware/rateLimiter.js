'use strict';

const rateLimit = require('express-rate-limit');
const { default: RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

// Build Redis store if REDIS_URL is configured; otherwise use memory store (dev)
function buildStore() {
  if (!process.env.REDIS_URL) return undefined;
  const client = new Redis(process.env.REDIS_URL);
  client.on('error', err => console.error('[redis] rate-limit error:', err.message));
  return new RedisStore({ sendCommand: (...args) => client.call(...args) });
}

const store = buildStore();

const defaults = { standardHeaders: true, legacyHeaders: false, store };

const loginLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

const registerLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de cadastro. Aguarde 1 hora.' },
});

const forgotPasswordLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas de recuperação de senha. Aguarde 1 hora.' },
});

const globalLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter, globalLimiter };
