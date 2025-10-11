const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Get comments for a recipe
router.get('/recipes/:recipeId/comments', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const sortField = sort === 'created_at' ? 'c.created_at' : 'c.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get total count of top-level comments (not replies)
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM recipe_comments
      WHERE recipe_id = $1 AND parent_id IS NULL AND is_moderated = FALSE
    `, [recipeId]);

    const total = parseInt(countResult.rows[0].total);

    // Get comments with replies
    const result = await pool.query(`
      SELECT
        c.id,
        c.recipe_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.id as author_id,
        u.display_name,
        u.role,
        COALESCE(reply_counts.reply_count, 0) as reply_count
      FROM recipe_comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN (
        SELECT parent_id, COUNT(*) as reply_count
        FROM recipe_comments
        WHERE parent_id IS NOT NULL AND is_moderated = FALSE
        GROUP BY parent_id
      ) reply_counts ON c.id = reply_counts.parent_id
      WHERE c.recipe_id = $1 AND c.is_moderated = FALSE
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `, [recipeId, parseInt(limit), offset]);

    // Group comments by parent_id to create threaded structure
    const comments = [];
    const commentMap = new Map();

    result.rows.forEach(comment => {
      const commentObj = {
        id: comment.id,
        recipeId: comment.recipe_id,
        parentId: comment.parent_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        author: {
          id: comment.author_id,
          displayName: comment.display_name,
          role: comment.role
        },
        replyCount: comment.reply_count || 0,
        replies: []
      };

      commentMap.set(comment.id, commentObj);

      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentObj);
        }
      } else {
        // This is a top-level comment
        comments.push(commentObj);
      }
    });

    res.json({
      comments,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new comment
router.post('/recipes/:recipeId/comments', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { recipeId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment content is too long (max 1000 characters)' });
    }

    // Validate recipe exists
    const recipeCheck = await client.query(
      'SELECT id FROM recipes WHERE id = $1',
      [recipeId]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // If replying to a comment, validate parent comment exists and belongs to the same recipe
    if (parentId) {
      const parentCheck = await client.query(`
        SELECT id FROM recipe_comments
        WHERE id = $1 AND recipe_id = $2 AND is_moderated = FALSE
      `, [parentId, recipeId]);

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    // Check if user is blocked from commenting
    const blockerCheck = await client.query(`
      SELECT 1 FROM user_blocks WHERE blocked_user_id = $1 LIMIT 1
    `, [userId]);

    if (blockerCheck.rows.length > 0) {
      return res.status(403).json({ error: 'You are blocked from commenting' });
    }

    // Create comment
    const commentResult = await client.query(`
      INSERT INTO recipe_comments (recipe_id, user_id, parent_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [recipeId, userId, parentId || null, content.trim()]);

    const commentId = commentResult.rows[0].id;
    const createdAt = commentResult.rows[0].created_at;

    await client.query('COMMIT');

    res.status(201).json({
      id: commentId,
      recipeId: parseInt(recipeId),
      parentId: parentId || null,
      content: content.trim(),
      createdAt,
      author: {
        id: userId,
        displayName: req.user.displayName,
        role: req.user.role
      },
      replyCount: 0,
      replies: []
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update a comment
router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment content is too long (max 1000 characters)' });
    }

    // Update comment (only if user owns it and it's not moderated)
    const result = await client.query(`
      UPDATE recipe_comments
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3 AND is_moderated = FALSE
      RETURNING recipe_id, created_at, updated_at
    `, [content.trim(), commentId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or access denied' });
    }

    const { recipe_id, created_at, updated_at } = result.rows[0];

    res.json({
      id: parseInt(commentId),
      recipeId: recipe_id,
      content: content.trim(),
      createdAt: created_at,
      updatedAt: updated_at,
      author: {
        id: userId,
        displayName: req.user.displayName,
        role: req.user.role
      }
    });

  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete a comment (owner or admin)
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Delete comment (owner or admin)
    const whereClause = isAdmin ? 'id = $1' : 'id = $1 AND user_id = $2';
    const params = isAdmin ? [commentId] : [commentId, userId];

    const result = await pool.query(`
      DELETE FROM recipe_comments
      WHERE ${whereClause} AND is_moderated = FALSE
      RETURNING id
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or access denied' });
    }

    res.json({ message: 'Comment deleted successfully' });

  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report a comment, chat message, or user
router.post('/reports', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { contentType, contentId, reason, description } = req.body;
    const reporterId = req.user.id;

    // Validate input
    if (!contentType || !['comment', 'chat_message', 'profile', 'other'].includes(contentType)) {
      return res.status(400).json({ error: 'Valid content type is required' });
    }

    if (!reason || !['spam', 'harassment', 'inappropriate', 'offensive', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'Valid reason is required' });
    }

    // Validate that the content exists and determine reported user
    let reportedUserId = null;
    let contentExists = false;

    switch (contentType) {
      case 'comment':
        const commentResult = await client.query(
          'SELECT user_id FROM recipe_comments WHERE id = $1',
          [contentId]
        );
        if (commentResult.rows.length > 0) {
          reportedUserId = commentResult.rows[0].user_id;
          contentExists = true;
        }
        break;

      case 'chat_message':
        const chatResult = await client.query(
          'SELECT user_id FROM recipe_chat_messages WHERE id = $1',
          [contentId]
        );
        if (chatResult.rows.length > 0) {
          reportedUserId = chatResult.rows[0].user_id;
          contentExists = true;
        }
        break;

      case 'profile':
        // For profile reports, contentId should be the user ID
        reportedUserId = contentId;
        const userResult = await client.query(
          'SELECT id FROM users WHERE id = $1',
          [contentId]
        );
        contentExists = userResult.rows.length > 0;
        break;

      case 'other':
        // For 'other' reports, content might not exist
        reportedUserId = contentId;
        contentExists = true; // Allow reports even if content doesn't exist
        break;
    }

    if (!contentExists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if already reported by this user
    const existingReport = await client.query(`
      SELECT id FROM user_reports
      WHERE reporter_id = $1 AND content_type = $2 AND content_id = $3
    `, [reporterId, contentType, contentId]);

    if (existingReport.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reported this content' });
    }

    // Create report
    const reportResult = await client.query(`
      INSERT INTO user_reports (reporter_id, reported_user_id, content_type, content_id, reason, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [reporterId, reportedUserId, contentType, contentId, reason, description]);

    await client.query('COMMIT');

    res.status(201).json({
      id: reportResult.rows[0].id,
      createdAt: reportResult.rows[0].created_at,
      message: 'Report submitted successfully'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get recipe suggestions
router.get('/recipes/:recipeId/suggestions', async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { page = 1, limit = 10, status = 'all' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'WHERE recipe_id = $1';
    let params = [recipeId];

    // Filter by status
    if (status !== 'all') {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM recipe_suggestions ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get suggestions
    params.push(parseInt(limit), offset);
    const result = await pool.query(`
      SELECT
        s.id,
        s.recipe_id,
        s.title,
        s.description,
        s.suggestion_type,
        s.status,
        s.created_at,
        s.updated_at,
        s.accepted_by,
        s.accepted_at,
        u.id as author_id,
        u.display_name,
        u.role
      FROM recipe_suggestions s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const suggestions = result.rows.map(suggestion => ({
      id: suggestion.id,
      recipeId: suggestion.recipe_id,
      title: suggestion.title,
      description: suggestion.description,
      suggestionType: suggestion.suggestion_type,
      status: suggestion.status,
      createdAt: suggestion.created_at,
      updatedAt: suggestion.updated_at,
      acceptedBy: suggestion.accepted_by,
      acceptedAt: suggestion.accepted_at,
      author: {
        id: suggestion.author_id,
        displayName: suggestion.display_name,
        role: suggestion.role
      }
    }));

    res.json({
      suggestions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a suggestion
router.post('/recipes/:recipeId/suggestions', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { recipeId } = req.params;
    const { title, description, suggestionType = 'improvement' } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Suggestion description is required' });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({ error: 'Suggestion description is too long (max 2000 characters)' });
    }

    // Validate recipe exists
    const recipeCheck = await client.query(
      'SELECT id FROM recipes WHERE id = $1',
      [recipeId]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Check if user is blocked
    const blockerCheck = await client.query(`
      SELECT 1 FROM user_blocks WHERE blocked_user_id = $1 LIMIT 1
    `, [userId]);

    if (blockerCheck.rows.length > 0) {
      return res.status(403).json({ error: 'You are blocked from submitting suggestions' });
    }

    // Create suggestion
    const suggestionResult = await client.query(`
      INSERT INTO recipe_suggestions (recipe_id, user_id, title, description, suggestion_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, [recipeId, userId, title?.trim() || null, description.trim(), suggestionType]);

    const suggestionId = suggestionResult.rows[0].id;
    const createdAt = suggestionResult.rows[0].created_at;

    await client.query('COMMIT');

    res.status(201).json({
      id: suggestionId,
      recipeId: parseInt(recipeId),
      title: title?.trim() || null,
      description: description.trim(),
      suggestionType,
      status: 'pending',
      createdAt,
      author: {
        id: userId,
        displayName: req.user.displayName,
        role: req.user.role
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating suggestion:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Block/unblock a user (admin only)
router.post('/blocks', authenticateToken, async (req, res) => {
  try {
    const { blockedUserId, reason } = req.body;
    const blockerId = req.user.id;

    // Only admins can block users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can block users' });
    }

    // Can't block yourself
    if (blockerId === parseInt(blockedUserId)) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Validate user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [blockedUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already blocked
    const existingBlock = await pool.query(`
      SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2
    `, [blockerId, blockedUserId]);

    if (existingBlock.rows.length > 0) {
      return res.status(409).json({ error: 'User is already blocked' });
    }

    // Create block
    await pool.query(`
      INSERT INTO user_blocks (blocker_id, blocked_user_id, reason)
      VALUES ($1, $2, $3)
    `, [blockerId, blockedUserId, reason]);

    res.status(201).json({ message: 'User blocked successfully' });

  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/blocks/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.id;

    // Only admins can unblock users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can unblock users' });
    }

    // Remove block
    const result = await pool.query(`
      DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2
    `, [blockerId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'User unblocked successfully' });

  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get blocked users (admin only)
router.get('/blocks', authenticateToken, async (req, res) => {
  try {
    // Only admins can view blocks
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT
        ub.blocked_user_id,
        ub.reason,
        ub.created_at,
        u.id,
        u.display_name,
        u.username,
        u.email,
        u.role
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_id = $1
      ORDER BY ub.created_at DESC
    `, [req.user.id]);

    const blocks = result.rows.map(block => ({
      userId: block.id,
      displayName: block.display_name,
      username: block.username,
      email: block.email,
      role: block.role,
      reason: block.reason,
      blockedAt: block.created_at
    }));

    res.json({ blocks });

  } catch (err) {
    console.error('Error fetching blocks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending reports (admin only)
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    // Only admins can view reports
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM user_reports WHERE status = $1',
      [status]
    );

    const total = parseInt(countResult.rows[0].total);

    // Get reports
    const result = await pool.query(`
      SELECT
        r.id,
        r.content_type,
        r.content_id,
        r.reason,
        r.description,
        r.status,
        r.reviewed_by,
        r.reviewed_at,
        r.action_taken,
        r.created_at,
        reporter.id as reporter_id,
        reporter.display_name as reporter_name,
        reported.id as reported_user_id,
        reported.display_name as reported_user_name
      FROM user_reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.status = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, parseInt(limit), offset]);

    const reports = result.rows.map(report => ({
      id: report.id,
      contentType: report.content_type,
      contentId: report.content_id,
      reason: report.reason,
      description: report.description,
      status: report.status,
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      actionTaken: report.action_taken,
      createdAt: report.created_at,
      reporter: {
        id: report.reporter_id,
        displayName: report.reporter_name
      },
      reportedUser: {
        id: report.reported_user_id,
        displayName: report.reported_user_name
      }
    }));

    res.json({
      reports,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Review/update a report (admin only)
router.put('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, status = 'resolved', actionTaken } = req.body;
    const adminId = req.user.id;

    // Only admins can review reports
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update report
    const result = await pool.query(`
      UPDATE user_reports
      SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, action_taken = $3
      WHERE id = $4 AND status = 'pending'
      RETURNING id
    `, [status, adminId, actionTaken, reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or already reviewed' });
    }

    // Handle moderation actions
    if (action === 'ban_user') {
      // Add user to blocks (if not already blocked)
      await pool.query(`
        INSERT INTO user_blocks (blocker_id, blocked_user_id, reason)
        VALUES ($1, (SELECT reported_user_id FROM user_reports WHERE id = $2), 'Banned due to reported behavior')
        ON CONFLICT DO NOTHING
      `, [adminId, reportId]);
    }

    res.json({
      message: 'Report reviewed successfully',
      reportId: parseInt(reportId)
    });

  } catch (err) {
    console.error('Error reviewing report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Moderate content (comments) - admin only
router.put('/moderate/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { action } = req.body; // 'approve' or 'hide'
    const adminId = req.user.id;

    // Only admins can moderate content
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['approve', 'hide'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Update comment moderation status
    const result = await pool.query(`
      UPDATE recipe_comments
      SET is_moderated = $1, moderated_by = $2, moderated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, recipe_id
    `, [action === 'hide', adminId, commentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({
      message: `Comment ${action}d successfully`,
      commentId: parseInt(commentId)
    });

  } catch (err) {
    console.error('Error moderating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
