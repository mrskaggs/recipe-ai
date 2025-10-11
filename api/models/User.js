const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.role = data.role || 'user';
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new user
  static async create({ email, password, username, role = 'user' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Hash the password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await client.query(
        `INSERT INTO users (email, username, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, role, created_at, updated_at`,
        [email, username, passwordHash, role]
      );

      await client.query('COMMIT');

      return new User(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, email, username, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, email, username, password_hash, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Verify password
  async verifyPassword(password) {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [this.id]);
    if (result.rows.length === 0) {
      return false;
    }

    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  // Update user
  async update(updates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }

      if (updates.username !== undefined) {
        fields.push(`username = $${paramIndex++}`);
        values.push(updates.username);
      }

      if (updates.role !== undefined) {
        fields.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }

      if (updates.password !== undefined) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(updates.password, saltRounds);
        fields.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(this.id);

      const result = await client.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, username, role, created_at, updated_at`,
        values
      );

      await client.query('COMMIT');

      // Update instance properties
      Object.assign(this, result.rows[0]);

      return this;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete user
  async delete() {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [this.id]);
    return result.rows.length > 0;
  }

  // Convert to JSON (without sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      displayName: this.username || this.email.split('@')[0],
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = User;
