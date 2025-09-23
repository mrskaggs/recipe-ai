-- Create database schema for recipe tracker

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    servings INTEGER DEFAULT 1,
    calories INTEGER DEFAULT 0,
    protein_g DECIMAL(5,1) DEFAULT 0,
    carbs_g DECIMAL(5,1) DEFAULT 0,
    fat_g DECIMAL(5,1) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create instructions table
CREATE TABLE IF NOT EXISTS recipe_instructions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe_tags junction table
CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_step ON recipe_instructions(recipe_id, step_number);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);

-- Insert some sample data for testing
INSERT INTO recipes (title, servings, calories, protein_g, carbs_g, fat_g, notes) VALUES
('Classic Spaghetti Bolognese', 4, 520, 28, 58, 18, 'A traditional Italian pasta dish with rich meat sauce'),
('Avocado Toast with Poached Egg', 2, 315, 12, 25, 19, 'Healthy breakfast option with good fats and protein'),
('Thai Green Curry with Tofu', 4, 420, 15, 35, 25, 'Spicy and aromatic Thai curry with vegetables')
ON CONFLICT DO NOTHING;

-- Insert sample tags
INSERT INTO tags (tag) VALUES
('italian'), ('pasta'), ('dinner'),
('breakfast'), ('vegetarian'), ('healthy'),
('asian'), ('spicy'), ('vegan')
ON CONFLICT (tag) DO NOTHING;

-- Insert sample ingredients for first recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient) VALUES
(1, '1 tbsp olive oil (15ml)'),
(1, '1 medium onion, diced'),
(1, '400g spaghetti pasta')
ON CONFLICT DO NOTHING;

-- Insert sample instructions for first recipe
INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES
(1, 1, 'Heat olive oil in a large pan over medium heat'),
(1, 2, 'Add diced onion and cook until softened'),
(1, 3, 'Cook pasta according to package directions')
ON CONFLICT DO NOTHING;

-- Link first recipe to tags
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
(1, 1), (1, 2), (1, 3)
ON CONFLICT DO NOTHING;
