const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const redis = require('redis');

const app = express();
const PORT = 3000;
const CACHE_TTL = 60; // 60 seconds

// Middleware
app.use(cors());
app.use(express.json());

console.log('Starting API server...');

// PostgreSQL connection
const pool = new Pool({
  host: 'database',
  port: 5432,
  database: 'tododb',
  user: 'todouser',
  password: 'mypassword',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Redis connection
let redisClient;
(async () => {
  redisClient = redis.createClient({
    socket: {
      host: 'redis',
      port: 6379
    }
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Connected to Redis'));

  await redisClient.connect();
})();

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const redisResult = await redisClient.ping();
    res.json({ 
      status: 'OK', 
      database: 'connected',
      redis: redisResult === 'PONG' ? 'connected' : 'disconnected',
      timestamp: dbResult.rows[0].now 
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ 
      status: 'ERROR', 
      message: err.message 
    });
  }
});

// GET all todos - WITH CACHE
app.get('/api/todos', async (req, res) => {
  console.log('GET /api/todos');
  try {
    // Check cache first
    const cachedTodos = await redisClient.get('todos:all');
    if (cachedTodos) {
      console.log('Cache HIT');
      return res.json(JSON.parse(cachedTodos));
    }

    console.log('Cache MISS - fetching from DB');
    const result = await pool.query(
      'SELECT * FROM todos ORDER BY created_at DESC'
    );
    
    // Store in cache
    await redisClient.setEx('todos:all', CACHE_TTL, JSON.stringify(result.rows));
    
    console.log(`Found ${result.rows.length} todos`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single todo
app.get('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/todos/${id}`);
  
  try {
    const result = await pool.query(
      'SELECT * FROM todos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST new todo - INVALIDATE CACHE
app.post('/api/todos', async (req, res) => {
  const { title, description } = req.body;
  console.log('POST /api/todos', { title, description });
  
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
      [title.trim(), description || null]
    );
    
    // Invalidate cache
    await redisClient.del('todos:all');
    console.log('Cache invalidated');
    
    console.log('Created todo:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update todo - INVALIDATE CACHE
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  console.log(`PUT /api/todos/${id}`, { title, description, completed });

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE todos SET title=$1, description=$2, completed=$3 WHERE id=$4 RETURNING *',
      [title.trim(), description || null, completed || false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Invalidate cache
    await redisClient.del('todos:all');

    console.log('Updated todo:', id);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE todo - INVALIDATE CACHE
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /api/todos/${id}`);

  try {
    const result = await pool.query(
      'DELETE FROM todos WHERE id=$1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Invalidate cache
    await redisClient.del('todos:all');

    console.log('Deleted todo:', id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('404:', req.method, req.url);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Todos:  http://localhost:${PORT}/api/todos`);
});