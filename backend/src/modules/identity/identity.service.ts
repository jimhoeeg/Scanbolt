/**
 * MODULE 1 — Identity service.
 * Registration, credential verification and JWT issuance.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, withTransaction } from '../../db/pool';
import { AuthUser, JwtPayload, RoleName } from '../../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '12h';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  company_name: string | null;
}

/** Load a user + their roles by email. */
async function findByEmail(email: string): Promise<(UserRow & { roles: RoleName[] }) | null> {
  const user = await queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, company_name
       FROM users
      WHERE email = $1 AND is_active = TRUE`,
    [email],
  );
  if (!user) return null;

  const roleRows = await query<{ name: RoleName }>(
    `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1`,
    [user.id],
  );
  return { ...user, roles: roleRows.map((r) => r.name) };
}

function signToken(payload: JwtPayload): string {
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
}

function toAuthUser(row: UserRow & { roles: RoleName[] }): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    companyName: row.company_name,
    roles: row.roles,
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: RoleName;
  companyName?: string;
}

/** Register a new user with a single role (standard_buyer by default). */
export async function register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
  const existing = await queryOne('SELECT 1 FROM users WHERE email = $1', [input.email]);
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, password_hash, full_name, company_name`,
      [input.email, passwordHash, input.fullName, input.companyName ?? null],
    );
    const created = rows[0];

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = $2`,
      [created.id, input.role],
    );

    // Dealers get a profile row so MODULE 4 pricing has a tier to read.
    if (input.role === 'dealer') {
      await client.query(
        `INSERT INTO dealer_profiles (user_id, pricing_tier) VALUES ($1, 'bronze')`,
        [created.id],
      );
    }
    return { ...created, roles: [input.role] as RoleName[] };
  });

  const token = signToken({ sub: user.id, email: user.email, roles: user.roles });
  return { user: toAuthUser(user), token };
}

/** Verify credentials and return a signed token. */
export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const user = await findByEmail(email);
  // Compare even when user is missing to avoid leaking which emails exist.
  const ok = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinva');

  if (!user || !ok) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken({ sub: user.id, email: user.email, roles: user.roles });
  return { user: toAuthUser(user), token };
}
