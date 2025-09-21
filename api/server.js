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

// Initialize database and test connection
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    try {
      console.log('Connected to PostgreSQL database');

      // Create tables if they don't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS recipes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          servings INTEGER DEFAULT 1,
          calories INTEGER DEFAULT 0,
          protein_g DECIMAL(5,1) DEFAULT 0,
          carbs_g DECIMAL(5,1) DEFAULT 0,
          fat_g DECIMAL(5,1) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id SERIAL PRIMARY KEY,
          recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
          ingredient TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS recipe_instructions (
          id SERIAL PRIMARY KEY,
          recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
          step_number INTEGER NOT NULL,
          instruction TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          tag VARCHAR(50) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS recipe_tags (
          recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
          tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (recipe_id, tag_id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at)`);

      console.log('Database tables initialized successfully');

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    console.log('Running in mock mode - database not available');
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

// POST submit recipe for processing (calls n8n webhook)
app.post('/api/recipes/submit', authenticateToken, async (req, res) => {
  try {
    const { title, recipeText, tags } = req.body;
    
    // Validate required fields
    if (!recipeText) {
      return res.status(400).json({ error: 'Recipe text is required' });
    }

    // Prepare data for n8n webhook
    const webhookData = {
      title: title || 'Untitled Recipe',
      recipeText: recipeText,
      tags: tags || []
    };

    // Get n8n webhook URL from environment
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
    
    if (!N8N_WEBHOOK_URL) {
      return res.status(500).json({ error: 'N8n webhook URL not configured' });
    }

    // Call n8n webhook
    const axios = require('axios');
    const webhookResponse = await axios.post(N8N_WEBHOOK_URL, webhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return the response from n8n
    res.json({
      message: 'Recipe submitted for processing',
      jobId: webhookResponse.data.jobId || 'processing',
      status: 'submitted'
    });
  } catch (err) {
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
      INSERT INTO recipes (title, servings, calories, protein_g, carbs_g, fat_g, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
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
