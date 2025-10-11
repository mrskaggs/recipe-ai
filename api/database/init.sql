-- Create database schema for recipe tracker

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    display_name VARCHAR(100),
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
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'processing', 'pending_review', 'published')),
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

-- Create recipe_views table for popularity tracking
CREATE TABLE IF NOT EXISTS recipe_views (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- nullable for anonymous views
    ip_address INET,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Remove the NOT NULL constraint on user_id for recipe_views (for anonymous views)
ALTER TABLE recipe_views ALTER COLUMN user_id DROP NOT NULL;

-- Create recipe_favorites table
CREATE TABLE IF NOT EXISTS recipe_favorites (
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recipe_id, user_id)
);

-- Create recipe_likes table
CREATE TABLE IF NOT EXISTS recipe_likes (
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recipe_id, user_id)
);

-- Migration: Add user_id column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'user_id') THEN
        ALTER TABLE recipes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Migration: Add status column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'status') THEN
        ALTER TABLE recipes ADD COLUMN status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'processing', 'pending_review', 'published'));
    END IF;
END $$;

-- Migration: Add display_name column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'display_name') THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
        -- Set display_name to username if username exists, otherwise use email prefix
        UPDATE users SET display_name = COALESCE(username, SPLIT_PART(email, '@', 1)) WHERE display_name IS NULL;
    END IF;
END $$;

-- Create indexes for better performance (after migrations to ensure columns exist)
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_step ON recipe_instructions(recipe_id, step_number);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
-- Indexes for new popularity tables
CREATE INDEX IF NOT EXISTS idx_recipe_views_recipe_id ON recipe_views(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_views_user_id ON recipe_views(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_views_viewed_at ON recipe_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_recipe_favorites_user_id ON recipe_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_user_id ON recipe_likes(user_id);

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

-- Create comments table for recipe comments
CREATE TABLE IF NOT EXISTS recipe_comments (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES recipe_comments(id) ON DELETE CASCADE, -- For threaded comments
    content TEXT NOT NULL,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderated_by INTEGER REFERENCES users(id),
    moderated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe chat messages table
CREATE TABLE IF NOT EXISTS recipe_chat_messages (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'suggestion')),
    edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe suggestions table
CREATE TABLE IF NOT EXISTS recipe_suggestions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT NOT NULL,
    suggestion_type VARCHAR(50) DEFAULT 'improvement' CHECK (suggestion_type IN ('improvement', 'variation', 'correction')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
    accepted_by INTEGER REFERENCES users(id),
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('comment', 'chat_message', 'profile', 'other')),
    content_id INTEGER, -- ID of the offending content
    reason VARCHAR(100) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'offensive', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    action_taken TEXT, -- Description of action taken
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user blocks table (one-way blocking)
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_user_id)
);

-- Create indexes for social features
CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe_id ON recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_user_id ON recipe_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_parent_id ON recipe_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_created_at ON recipe_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_chat_recipe_id ON recipe_chat_messages(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_chat_user_id ON recipe_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_chat_created_at ON recipe_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_suggestions_recipe_id ON recipe_suggestions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_suggestions_user_id ON recipe_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_suggestions_status ON recipe_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_content_type ON user_reports(content_type);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_user_id ON user_blocks(blocked_user_id);
