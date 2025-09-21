const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Helper function to parse ingredients from strings to objects
function parseIngredients(ingredients) {
  return ingredients.map(ingredient => {
    // Simple parsing logic - can be enhanced
    const parts = ingredient.split(' ');
    const qty = parseFloat(parts[0]);
    const unit = isNaN(qty) ? undefined : parts[1];
    const item = isNaN(qty) ? ingredient : parts.slice(2).join(' ');

    return {
      qty: isNaN(qty) ? undefined : qty,
      unit,
      item,
    };
  });
}

// GET all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      whereClause += ` WHERE (email ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add role filter
    if (role) {
      if (whereClause) {
        whereClause += ' AND ';
      } else {
        whereClause += ' WHERE ';
      }
      whereClause += ` role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const query = `
      SELECT id, email, username, role, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    res.json({
      users: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, username, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update user
router.put('/users/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { email, username, role } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    // Update user
    const result = await client.query(`
      UPDATE users
      SET email = $1, username = $2, role = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, username, role, created_at, updated_at
    `, [email, username, role, id]);

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting the current admin user
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET all recipes for admin (with user info)
router.get('/recipes', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      whereClause += ` WHERE r.title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM recipes r${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get recipes with pagination
    const query = `
      SELECT
        r.id,
        r.title,
        r.servings,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
        r.notes,
        r.created_at,
        r.updated_at,
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    // Transform recipes
    const transformedRecipes = result.rows.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined,
      tags: recipe.tags || [],
      imageUrl: undefined,
      sourceUrl: undefined,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined,
      status: 'published',
    }));

    res.json({
      recipes: transformedRecipes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching recipes for admin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single recipe by ID for admin
router.get('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT
        r.id,
        r.title,
        r.servings,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
        r.notes,
        r.created_at,
        r.updated_at,
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = result.rows[0];

    // Transform data
    const transformedRecipe = {
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined,
      tags: recipe.tags || [],
      imageUrl: undefined,
      sourceUrl: undefined,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined,
      status: 'published',
    };

    res.json(transformedRecipe);
  } catch (err) {
    console.error('Error fetching recipe for admin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update recipe
router.put('/recipes/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, servings, ingredients, instructions, tags, notes, calories, protein_g, carbs_g, fat_g } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if recipe exists
    const existingRecipe = await client.query(
      'SELECT id FROM recipes WHERE id = $1',
      [id]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Update recipe
    const recipeResult = await client.query(`
      UPDATE recipes
      SET title = $1, servings = $2, calories = $3, protein_g = $4, carbs_g = $5, fat_g = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id
    `, [title, servings, calories, protein_g, carbs_g, fat_g, notes, id]);

    const recipeId = recipeResult.rows[0].id;

    // Update ingredients
    if (ingredients && Array.isArray(ingredients)) {
      // Delete existing ingredients
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

      // Insert new ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = typeof ingredients[i] === 'string' ? ingredients[i] : ingredients[i].item;
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient)
          VALUES ($1, $2)
        `, [recipeId, ingredient]);
      }
    }

    // Update instructions
    if (instructions && Array.isArray(instructions)) {
      // Delete existing instructions
      await client.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [recipeId]);

      // Insert new instructions
      for (let i = 0; i < instructions.length; i++) {
        await client.query(`
          INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
          VALUES ($1, $2, $3)
        `, [recipeId, i + 1, instructions[i]]);
      }
    }

    // Update tags
    if (tags && Array.isArray(tags)) {
      // Delete existing tags
      await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);

      // Insert new tags
      for (const tag of tags) {
        // Insert or get tag
        const tagResult = await client.query(`
          INSERT INTO tags (tag) VALUES ($1)
          ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
          RETURNING id
        `, [tag]);

        const tagId = tagResult.rows[0].id;

        // Link recipe to tag
        await client.query(`
          INSERT INTO recipe_tags (recipe_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [recipeId, tagId]);
      }
    }

    await client.query('COMMIT');

    // Return updated recipe
    const updatedRecipe = await client.query(`
      SELECT
        r.id,
        r.title,
        r.servings,
        r.calories,
        r.protein_g,
        r.carbs_g,
        r.fat_g,
        r.notes,
        r.created_at,
        r.updated_at,
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      WHERE r.id = $1
    `, [recipeId]);

    const recipe = updatedRecipe.rows[0];
    const transformedRecipe = {
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined,
      tags: recipe.tags || [],
      imageUrl: undefined,
      sourceUrl: undefined,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined,
      status: 'published',
    };

    res.json(transformedRecipe);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE recipe
router.delete('/recipes/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if recipe exists
    const existingRecipe = await client.query(
      'SELECT id FROM recipes WHERE id = $1',
      [id]
    );

    if (existingRecipe.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Delete recipe (cascade will handle related tables)
    await client.query('DELETE FROM recipes WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
