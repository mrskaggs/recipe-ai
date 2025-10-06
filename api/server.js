const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const { pool } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Run database migrations if needed
async function runMigrations(client) {
  console.log('Checking for required database migrations...');

  // Check if recipes table has required columns
  const columnResult = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'recipes'
    AND column_name IN ('user_id', 'status', 'updated_at')
  `);

  const existingColumns = columnResult.rows.map(row => row.column_name);
  const requiredColumns = ['user_id', 'status', 'updated_at'];

  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

  if (missingColumns.length > 0) {
    console.log('Missing columns detected:', missingColumns);
    console.log('Running database migrations...');

    // Run migrations for missing columns
    for (const column of missingColumns) {
      switch (column) {
        case 'user_id':
          console.log('Adding user_id column to recipes table...');
          await client.query(`
            ALTER TABLE recipes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
          `);
          break;
        case 'status':
          console.log('Adding status column to recipes table...');
          await client.query(`
            ALTER TABLE recipes ADD COLUMN status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'processing', 'pending_review', 'published'))
          `);
          break;
        case 'updated_at':
          console.log('Adding updated_at column to recipes table...');
          await client.query(`
            ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          `);
          break;
      }
    }

    // Create indexes if they don't exist
    console.log('Ensuring indexes exist...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_instructions_step ON recipe_instructions(recipe_id, step_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id)`);

    // Update existing recipes with default values
    console.log('Updating existing recipes with default values...');
    await client.query(`UPDATE recipes SET status = 'published' WHERE status IS NULL`);
    await client.query(`UPDATE recipes SET updated_at = created_at WHERE updated_at IS NULL`);

    console.log('Database migrations completed successfully!');
  } else {
    console.log('Database schema is up to date');
  }
}

// Initialize database and test connection
async function initializeDatabase() {
  try {
    // Test database connection
    const client = await pool.connect();
    try {
      console.log('Connected to PostgreSQL database');

      // Check if tables exist (they should be created by init.sql)
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'recipes', 'recipe_ingredients', 'recipe_instructions', 'tags', 'recipe_tags')
      `);

      const existingTables = result.rows.map(row => row.table_name);
      const requiredTables = ['users', 'recipes', 'recipe_ingredients', 'recipe_instructions', 'tags', 'recipe_tags'];

      console.log('Existing tables:', existingTables);

      if (existingTables.length === requiredTables.length) {
        console.log('All database tables exist');

        // Run migrations if needed
        await runMigrations(client);

      } else {
        console.log('Some tables may be missing. Tables found:', existingTables);
        console.log('Required tables:', requiredTables);
        console.log('Database may not be properly initialized. Please check init.sql');
      }

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to database:', err);
    console.log('Database not available - application will run in limited mode');
  }
}

// Initialize database on startup
initializeDatabase().catch(console.error);

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

// Mock data for when database is not available
const mockRecipes = [
  {
    id: 1,
    title: 'Classic Spaghetti Carbonara',
    summary: 'A traditional Italian pasta dish with eggs, cheese, and pancetta',
    servings: 4,
    totalTimeMin: 30,
    tags: ['pasta', 'italian', 'quick'],
    imageUrl: undefined,
    sourceUrl: undefined,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    ingredients: [
      { qty: 400, unit: 'g', item: 'spaghetti' },
      { qty: 200, unit: 'g', item: 'pancetta' },
      { qty: 4, unit: undefined, item: 'large eggs' },
      { qty: 100, unit: 'g', item: 'Parmesan cheese' },
      { qty: 1, unit: 'tsp', item: 'black pepper' }
    ],
    steps: [
      'Bring a large pot of salted water to boil and cook spaghetti according to package directions.',
      'While pasta cooks, heat pancetta in a large skillet over medium heat until crispy.',
      'In a bowl, whisk together eggs, grated Parmesan, and black pepper.',
      'Reserve 1 cup of pasta water, then drain spaghetti.',
      'Add hot spaghetti to the skillet with pancetta and toss quickly.',
      'Remove from heat and quickly stir in the egg mixture, adding pasta water as needed to create a creamy sauce.',
      'Serve immediately with extra Parmesan and black pepper.'
    ],
    nutrition: {
      calories: 650,
      protein: 28,
      carbs: 75,
      fat: 25
    },
    author: { id: '1', name: 'Chef Mario' },
    status: 'published'
  },
  {
    id: 2,
    title: 'Chicken Stir Fry',
    summary: 'Quick and healthy stir fry with vegetables and tender chicken',
    servings: 4,
    totalTimeMin: 25,
    tags: ['chicken', 'healthy', 'asian'],
    imageUrl: undefined,
    sourceUrl: undefined,
    createdAt: '2025-01-20T14:30:00Z',
    updatedAt: '2025-01-20T14:30:00Z',
    ingredients: [
      { qty: 500, unit: 'g', item: 'chicken breast' },
      { qty: 2, unit: undefined, item: 'bell peppers' },
      { qty: 200, unit: 'g', item: 'broccoli florets' },
      { qty: 3, unit: 'tbsp', item: 'soy sauce' },
      { qty: 2, unit: 'tbsp', item: 'sesame oil' },
      { qty: 2, unit: 'cloves', item: 'garlic' }
    ],
    steps: [
      'Cut chicken into bite-sized pieces and season with salt and pepper.',
      'Heat sesame oil in a large wok or skillet over high heat.',
      'Add chicken and stir fry for 5-7 minutes until cooked through.',
      'Add minced garlic and stir for 30 seconds.',
      'Add bell peppers and broccoli, stir fry for 3-4 minutes.',
      'Pour in soy sauce and toss everything together.',
      'Cook for another 2 minutes until vegetables are tender-crisp.',
      'Serve hot over rice or noodles.'
    ],
    nutrition: {
      calories: 320,
      protein: 35,
      carbs: 12,
      fat: 15
    },
    author: { id: '2', name: 'Chef Linda' },
    status: 'published'
  }
];

const mockTags = [
  { id: 1, name: 'pasta', count: 1 },
  { id: 2, name: 'italian', count: 1 },
  { id: 3, name: 'quick', count: 1 },
  { id: 4, name: 'chicken', count: 1 },
  { id: 5, name: 'healthy', count: 1 },
  { id: 6, name: 'asian', count: 1 }
];

// Routes

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Recipe API is running' });
});

// GET all recipes with pagination and filtering
app.get('/api/recipes', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tags, sort = 'created_at', order = 'desc' } = req.query;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      whereClause += ` WHERE r.title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      if (whereClause) {
        whereClause += ' AND ';
      } else {
        whereClause += ' WHERE ';
      }
      whereClause += ` r.id IN (
        SELECT rt.recipe_id FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE t.tag = ANY($${paramIndex})
      )`;
      params.push(tagArray);
      paramIndex++;
    }

    // Validate sort field
    const allowedSortFields = ['title', 'created_at', 'servings', 'calories'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

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
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      ${whereClause}
      ORDER BY r.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    // Transform recipes to match frontend expectations
    const transformedRecipes = result.rows.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined, // Not stored in DB
      tags: recipe.tags || [],
      imageUrl: undefined, // Not implemented
      sourceUrl: undefined, // Not implemented
      createdAt: recipe.created_at,
      updatedAt: recipe.created_at, // Using created_at as updated_at
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined, // Not implemented
      status: 'published', // Default status
    }));

    res.json({
      recipes: transformedRecipes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching recipes:', err);
    // Return mock data when database is not available
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRecipes = mockRecipes.slice(startIndex, endIndex);

    res.json({
      recipes: paginatedRecipes,
      total: mockRecipes.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(mockRecipes.length / limitNum)
    });
  }
});

// GET single recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
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

    // Transform data to match frontend expectations
    const transformedRecipe = {
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined, // Not stored in DB
      tags: recipe.tags || [],
      imageUrl: undefined, // Not implemented
      sourceUrl: undefined, // Not implemented
      createdAt: recipe.created_at,
      updatedAt: recipe.created_at, // Using created_at as updated_at
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined, // Not implemented
      status: 'published', // Default status
    };

    res.json(transformedRecipe);
  } catch (err) {
    console.error('Error fetching recipe:', err);
    // Return mock data when database is not available
    const recipeId = parseInt(req.params.id);
    const mockRecipe = mockRecipes.find(r => r.id === recipeId);

    if (!mockRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json(mockRecipe);
  }
});

// POST submit recipe for processing (creates draft recipe, then calls n8n webhook)
app.post('/api/recipes/submit', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { title, recipeText, tags } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!recipeText) {
      return res.status(400).json({ error: 'Recipe text is required' });
    }

    // Create draft recipe immediately
    const recipeResult = await client.query(`
      INSERT INTO recipes (user_id, title, status, notes, created_at)
      VALUES ($1, $2, 'processing', $3, CURRENT_TIMESTAMP)
      RETURNING id
    `, [userId, title || 'AI Recipe Processing...', recipeText]);

    const recipeId = recipeResult.rows[0].id;

    // Prepare data for n8n webhook
    const webhookData = {
      recipeId: recipeId,
      recipeText: recipeText,
      userId: userId,
      title: title || 'Untitled Recipe',
      tags: tags || []
    };

    // Get n8n webhook URL from environment
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    if (!N8N_WEBHOOK_URL) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'N8n webhook URL not configured' });
    }

    await client.query('COMMIT');

    // Call n8n webhook (after commit to avoid long-running transaction)
    const axios = require('axios');
    const webhookResponse = await axios.post(N8N_WEBHOOK_URL, webhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return success response
    res.json({
      message: 'Recipe submitted for AI processing',
      recipeId: recipeId,
      jobId: webhookResponse.data.jobId || 'processing',
      status: 'processing'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error submitting recipe to n8n:', err);

    // Handle specific error types
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Recipe processing service unavailable. Please try again later.',
        details: 'The AI processing service is currently down.'
      });
    }

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return res.status(504).json({
        error: 'Recipe processing timed out. Your recipe may still be processing.',
        details: 'The AI processing is taking longer than expected. Please check back later or try submitting again.'
      });
    }

    if (err.response) {
      // n8n returned an error response
      return res.status(err.response.status).json({
        error: err.response.data?.error || 'Error processing recipe',
        details: err.response.data?.message || 'The AI processing service returned an error.'
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      details: 'An unexpected error occurred while processing your recipe.'
    });
  } finally {
    client.release();
  }
});

// POST new recipe (from n8n workflow)
app.post('/api/recipes', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Extract data from n8n format
    const recipeData = req.body[0]?.output || req.body;
    
    const {
      title,
      servings,
      ingredients,
      instructions,
      macros_per_serving,
      tags,
      notes
    } = recipeData;
    
    // Insert recipe
    const recipeResult = await client.query(`
      INSERT INTO recipes (user_id, title, servings, calories, protein_g, carbs_g, fat_g, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      null, // user_id - null for AI-generated recipes
      title,
      servings,
      macros_per_serving?.calories || 0,
      macros_per_serving?.protein_g || 0,
      macros_per_serving?.carbs_g || 0,
      macros_per_serving?.fat_g || 0,
      notes || ''
    ]);
    
    const recipeId = recipeResult.rows[0].id;
    
    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient)
          VALUES ($1, $2)
        `, [recipeId, ingredient]);
      }
    }
    
    // Insert instructions
    if (instructions && instructions.length > 0) {
      for (let i = 0; i < instructions.length; i++) {
        await client.query(`
          INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
          VALUES ($1, $2, $3)
        `, [recipeId, i + 1, instructions[i]]);
      }
    }
    
    // Insert tags
    if (tags && tags.length > 0) {
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
    
    res.status(201).json({ 
      message: 'Recipe created successfully', 
      recipeId: recipeId 
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST create recipe (authenticated users)
app.post('/api/recipes/create', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { title, servings, ingredients, instructions, nutrition, tags, notes } = req.body;
    const userId = req.user.id; // From JWT token

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Recipe title is required' });
    }

    // Insert recipe
    const recipeResult = await client.query(`
      INSERT INTO recipes (user_id, title, servings, calories, protein_g, carbs_g, fat_g, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      userId,
      title,
      servings || 1,
      nutrition?.calories || 0,
      nutrition?.protein || 0,
      nutrition?.carbs || 0,
      nutrition?.fat || 0,
      notes || ''
    ]);

    const recipeId = recipeResult.rows[0].id;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        // Handle both string and object formats
        const ingredientText = typeof ingredient === 'string' ? ingredient :
          ingredient.qty ? `${ingredient.qty} ${ingredient.unit || ''} ${ingredient.item}`.trim() :
          ingredient.item || '';

        if (ingredientText) {
          await client.query(`
            INSERT INTO recipe_ingredients (recipe_id, ingredient)
            VALUES ($1, $2)
          `, [recipeId, ingredientText]);
        }
      }
    }

    // Insert instructions
    if (instructions && instructions.length > 0) {
      for (let i = 0; i < instructions.length; i++) {
        const instruction = typeof instructions[i] === 'string' ? instructions[i] : instructions[i].text || '';
        if (instruction) {
          await client.query(`
            INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
            VALUES ($1, $2, $3)
          `, [recipeId, i + 1, instruction]);
        }
      }
    }

    // Insert tags
    if (tags && tags.length > 0) {
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

    res.status(201).json({
      message: 'Recipe created successfully',
      recipeId: recipeId
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT update recipe (recipe owners only)
app.put('/api/recipes/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, servings, ingredients, instructions, nutrition, tags, notes } = req.body;
    const userId = req.user.id;

    // Check if recipe exists and belongs to user
    const recipeCheck = await client.query(
      'SELECT user_id FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipeCheck.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own recipes' });
    }

    // Update recipe
    await client.query(`
      UPDATE recipes
      SET title = $1, servings = $2, calories = $3, protein_g = $4, carbs_g = $5, fat_g = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      title,
      servings || 1,
      nutrition?.calories || 0,
      nutrition?.protein || 0,
      nutrition?.carbs || 0,
      nutrition?.fat || 0,
      notes || '',
      id
    ]);

    // Delete existing ingredients and instructions
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]);

    // Insert updated ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        const ingredientText = typeof ingredient === 'string' ? ingredient :
          ingredient.qty ? `${ingredient.qty} ${ingredient.unit || ''} ${ingredient.item}`.trim() :
          ingredient.item || '';

        if (ingredientText) {
          await client.query(`
            INSERT INTO recipe_ingredients (recipe_id, ingredient)
            VALUES ($1, $2)
          `, [id, ingredientText]);
        }
      }
    }

    // Insert updated instructions
    if (instructions && instructions.length > 0) {
      for (let i = 0; i < instructions.length; i++) {
        const instruction = typeof instructions[i] === 'string' ? instructions[i] : instructions[i].text || '';
        if (instruction) {
          await client.query(`
            INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
            VALUES ($1, $2, $3)
          `, [id, i + 1, instruction]);
        }
      }
    }

    // Insert updated tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const tagResult = await client.query(`
          INSERT INTO tags (tag) VALUES ($1)
          ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
          RETURNING id
        `, [tag]);

        const tagId = tagResult.rows[0].id;

        await client.query(`
          INSERT INTO recipe_tags (recipe_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [id, tagId]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Recipe updated successfully',
      recipeId: id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// DELETE recipe (recipe owners only)
app.delete('/api/recipes/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if recipe exists and belongs to user
    const recipeCheck = await client.query(
      'SELECT user_id FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipeCheck.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own recipes' });
    }

    // Delete recipe (CASCADE will handle related tables)
    await client.query('DELETE FROM recipes WHERE id = $1', [id]);

    res.json({ message: 'Recipe deleted successfully' });

  } catch (err) {
    console.error('Error deleting recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT process recipe (n8n updates recipe with AI-processed data)
app.put('/api/recipes/:id/process', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      title,
      servings,
      ingredients,
      instructions,
      macros_per_serving,
      tags,
      notes
    } = req.body;

    // Update recipe with processed data
    await client.query(`
      UPDATE recipes
      SET title = $1, servings = $2, calories = $3, protein_g = $4, carbs_g = $5, fat_g = $6,
          notes = $7, status = 'pending_review', updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      title,
      servings || 1,
      macros_per_serving?.calories || 0,
      macros_per_serving?.protein_g || 0,
      macros_per_serving?.carbs_g || 0,
      macros_per_serving?.fat_g || 0,
      notes || '',
      id
    ]);

    // Delete existing ingredients and instructions
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]);

    // Insert processed ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient)
          VALUES ($1, $2)
        `, [id, ingredient]);
      }
    }

    // Insert processed instructions
    if (instructions && instructions.length > 0) {
      for (let i = 0; i < instructions.length; i++) {
        await client.query(`
          INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
          VALUES ($1, $2, $3)
        `, [id, i + 1, instructions[i]]);
      }
    }

    // Insert processed tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const tagResult = await client.query(`
          INSERT INTO tags (tag) VALUES ($1)
          ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
          RETURNING id
        `, [tag]);

        const tagId = tagResult.rows[0].id;

        await client.query(`
          INSERT INTO recipe_tags (recipe_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [id, tagId]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Recipe processed successfully',
      recipeId: id,
      status: 'pending_review'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// PUT approve/edit recipe (user reviews and publishes)
app.put('/api/recipes/:id/approve', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { title, servings, ingredients, instructions, nutrition, tags, notes } = req.body;
    const userId = req.user.id;

    // Check if recipe exists, belongs to user, and is in pending_review status
    const recipeCheck = await client.query(
      'SELECT user_id, status FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipeCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only approve your own recipes' });
    }

    if (recipeCheck.rows[0].status !== 'pending_review') {
      return res.status(400).json({ error: 'Recipe is not ready for review' });
    }

    // Update recipe with user edits and set to published
    await client.query(`
      UPDATE recipes
      SET title = $1, servings = $2, calories = $3, protein_g = $4, carbs_g = $5, fat_g = $6,
          notes = $7, status = 'published', updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `, [
      title,
      servings || 1,
      nutrition?.calories || 0,
      nutrition?.protein || 0,
      nutrition?.carbs || 0,
      nutrition?.fat || 0,
      notes || '',
      id
    ]);

    // Delete existing ingredients and instructions
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_instructions WHERE recipe_id = $1', [id]);
    await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [id]);

    // Insert updated ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        const ingredientText = typeof ingredient === 'string' ? ingredient :
          ingredient.qty ? `${ingredient.qty} ${ingredient.unit || ''} ${ingredient.item}`.trim() :
          ingredient.item || '';

        if (ingredientText) {
          await client.query(`
            INSERT INTO recipe_ingredients (recipe_id, ingredient)
            VALUES ($1, $2)
          `, [id, ingredientText]);
        }
      }
    }

    // Insert updated instructions
    if (instructions && instructions.length > 0) {
      for (let i = 0; i < instructions.length; i++) {
        const instruction = typeof instructions[i] === 'string' ? instructions[i] : instructions[i].text || '';
        if (instruction) {
          await client.query(`
            INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
            VALUES ($1, $2, $3)
          `, [id, i + 1, instruction]);
        }
      }
    }

    // Insert updated tags
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const tagResult = await client.query(`
          INSERT INTO tags (tag) VALUES ($1)
          ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
          RETURNING id
        `, [tag]);

        const tagId = tagResult.rows[0].id;

        await client.query(`
          INSERT INTO recipe_tags (recipe_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [id, tagId]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Recipe approved and published successfully',
      recipeId: id,
      status: 'published'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET user's recipes
app.get('/api/user/recipes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM recipes WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get user's recipes
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
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

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
      updatedAt: recipe.created_at,
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
    console.error('Error fetching user recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all tags with counts
app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.tag as name,
        COUNT(rt.recipe_id) as count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      GROUP BY t.id, t.tag
      ORDER BY count DESC, t.tag ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    // Return mock data when database is not available
    res.json(mockTags);
  }
});

// GET search recipes (alias for /api/recipes with search params)
app.get('/api/recipes/search', async (req, res) => {
  try {
    const { q: search, tags, page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;

    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    // Add search filter
    if (search) {
      whereClause += ` WHERE (r.title ILIKE $${paramIndex} OR r.notes ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add tags filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      if (whereClause) {
        whereClause += ' AND ';
      } else {
        whereClause += ' WHERE ';
      }
      whereClause += ` r.id IN (
        SELECT rt.recipe_id FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE t.tag = ANY($${paramIndex})
      )`;
      params.push(tagArray);
      paramIndex++;
    }

    // Validate sort field
    const allowedSortFields = ['title', 'created_at', 'servings', 'calories'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

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
        (SELECT COALESCE(array_agg(ingredient), '{}') FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients,
        (SELECT COALESCE(array_agg(instruction ORDER BY step_number), '{}') FROM recipe_instructions WHERE recipe_id = r.id) as instructions,
        (SELECT COALESCE(array_agg(t.tag), '{}') FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id WHERE rt.recipe_id = r.id) as tags
      FROM recipes r
      ${whereClause}
      ORDER BY r.${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    // Transform recipes to match frontend expectations
    const transformedRecipes = result.rows.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      summary: recipe.notes || undefined,
      servings: recipe.servings,
      totalTimeMin: undefined, // Not stored in DB
      tags: recipe.tags || [],
      imageUrl: undefined, // Not implemented
      sourceUrl: undefined, // Not implemented
      createdAt: recipe.created_at,
      updatedAt: recipe.created_at, // Using created_at as updated_at
      ingredients: parseIngredients(recipe.ingredients || []),
      steps: recipe.instructions || [],
      nutrition: recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g ? {
        calories: recipe.calories || undefined,
        protein: recipe.protein_g || undefined,
        carbs: recipe.carbs_g || undefined,
        fat: recipe.fat_g || undefined,
      } : undefined,
      author: undefined, // Not implemented
      status: 'published', // Default status
    }));

    res.json({
      recipes: transformedRecipes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error searching recipes:', err);
    // Return mock data when database is not available
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRecipes = mockRecipes.slice(startIndex, endIndex);

    res.json({
      recipes: paginatedRecipes,
      total: mockRecipes.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(mockRecipes.length / limitNum)
    });
  }
});

// Swagger/OpenAPI documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Recipe API',
      description: 'A REST API for managing recipes with ingredients, instructions, and nutritional information',
      version: '1.0.0',
      contact: {
        name: 'Recipe API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local development server'
      },
      {
        url: 'https://api.recipe-ai.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Recipe: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique recipe identifier',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Recipe title',
              example: 'Chicken Stir Fry'
            },
            servings: {
              type: 'integer',
              description: 'Number of servings',
              example: 4
            },
            calories: {
              type: 'integer',
              description: 'Calories per serving',
              example: 350
            },
            protein_g: {
              type: 'number',
              description: 'Protein in grams per serving',
              example: 35.0
            },
            carbs_g: {
              type: 'number',
              description: 'Carbohydrates in grams per serving',
              example: 15.0
            },
            fat_g: {
              type: 'number',
              description: 'Fat in grams per serving',
              example: 12.0
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the recipe',
              example: 'Quick and easy dinner recipe'
            },
            ingredients: {
              type: 'array',
              description: 'List of ingredients',
              items: {
                type: 'string'
              },
              example: ['1 lb chicken breast', '2 cups broccoli', '1 bell pepper']
            },
            instructions: {
              type: 'array',
              description: 'Step-by-step cooking instructions',
              items: {
                type: 'string'
              },
              example: ['Cut chicken into pieces', 'Stir fry chicken', 'Add vegetables']
            },
            tags: {
              type: 'array',
              description: 'Recipe tags for categorization',
              items: {
                type: 'string'
              },
              example: ['chicken', 'stir-fry', 'healthy']
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Recipe creation timestamp',
              example: '2023-12-01T10:00:00Z'
            }
          }
        },
        RecipeInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Recipe title',
              example: 'Chicken Stir Fry'
            },
            servings: {
              type: 'integer',
              description: 'Number of servings',
              default: 1,
              example: 4
            },
            ingredients: {
              type: 'array',
              description: 'List of ingredients',
              items: {
                type: 'string'
              },
              example: ['1 lb chicken breast', '2 cups broccoli', '1 bell pepper']
            },
            instructions: {
              type: 'array',
              description: 'Step-by-step cooking instructions',
              items: {
                type: 'string'
              },
              example: ['Cut chicken into pieces', 'Stir fry chicken', 'Add vegetables']
            },
            macros_per_serving: {
              type: 'object',
              description: 'Nutritional information per serving',
              properties: {
                calories: {
                  type: 'integer',
                  description: 'Calories per serving',
                  example: 350
                },
                protein_g: {
                  type: 'number',
                  description: 'Protein in grams per serving',
                  example: 35.0
                },
                carbs_g: {
                  type: 'number',
                  description: 'Carbohydrates in grams per serving',
                  example: 15.0
                },
                fat_g: {
                  type: 'number',
                  description: 'Fat in grams per serving',
                  example: 12.0
                }
              }
            },
            tags: {
              type: 'array',
              description: 'Recipe tags for categorization',
              items: {
                type: 'string'
              },
              example: ['chicken', 'stir-fry', 'healthy']
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the recipe',
              example: 'Quick and easy dinner recipe'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Internal server error'
            }
          }
        }
      }
    }
  },
  apis: [] // We'll define the paths manually since we're using a custom spec
};

// Load OpenAPI spec from YAML file if it exists
let swaggerSpec;
try {
  const yaml = require('js-yaml');
  const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
  swaggerSpec = swaggerDocument;
} catch (error) {
  console.log('Using inline Swagger spec (YAML file not found or invalid)');
  swaggerSpec = swaggerJsdoc(swaggerOptions);
}

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Start server
app.listen(port, () => {
  console.log(`Recipe API server running on port ${port}`);
  console.log(`API Documentation available at: http://localhost:${port}/api-docs`);
});

module.exports = app;
