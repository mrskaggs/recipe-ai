-- Migration script to add missing columns to existing database
-- Run this on deployed databases that were created before the schema updates

-- Add user_id column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'user_id') THEN
        ALTER TABLE recipes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to recipes table';
    ELSE
        RAISE NOTICE 'user_id column already exists in recipes table';
    END IF;
END $$;

-- Add status column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'status') THEN
        ALTER TABLE recipes ADD COLUMN status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'processing', 'pending_review', 'published'));
        RAISE NOTICE 'Added status column to recipes table';
    ELSE
        RAISE NOTICE 'status column already exists in recipes table';
    END IF;
END $$;

-- Add updated_at column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'updated_at') THEN
        ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to recipes table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in recipes table';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_step ON recipe_instructions(recipe_id, step_number);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);

-- Update existing recipes to have a default status if they don't have one
UPDATE recipes SET status = 'published' WHERE status IS NULL;

-- Update updated_at for existing recipes
UPDATE recipes SET updated_at = created_at WHERE updated_at IS NULL;

RAISE NOTICE 'Migration completed successfully';
