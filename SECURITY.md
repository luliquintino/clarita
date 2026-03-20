# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest (main) | ✅ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: security@clarita.app

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours.

## LGPD Compliance

Clarita was built to comply with Brazil's General Data Protection Law (Lei 13.709/2018 — LGPD):

- Health data is treated as sensitive personal data
- Patients have full control over who accesses their records (see `RecordSharingPanel`)
- Access can be revoked at any time
- JWT tokens expire automatically (7 days)
- Passwords are hashed with bcrypt (10 rounds)
- All database queries use parameterized statements (no SQL injection risk)

## Security Features

- JWT-based stateless authentication
- Role-Based Access Control (RBAC) — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Relationship-based access: professionals can only access their own patients
- HTTP security headers via Helmet.js
- CORS restricted to configured origins
