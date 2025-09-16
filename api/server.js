const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'recipes',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Initialize database and test connection
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database');
    
    // Create tables if they don't exist
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
    
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

// Initialize database on startup
initializeDatabase().catch(console.error);

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Recipe API is running' });
});

// GET all recipes
app.get('/api/recipes', async (req, res) => {
  try {
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
      ORDER BY r.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
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
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
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
