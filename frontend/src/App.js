import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Lae todos kui komponent laetakse
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      console.log('Fetching todos from /api/todos');
      const response = await axios.get('/api/todos');
      console.log('Received todos:', response.data);
      setTodos(response.data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch todos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    
    if (!newTitle.trim()) {
      setError('Title cannot be empty');
      return;
    }

    try {
      console.log('Creating todo:', { title: newTitle, description: newDescription });
      const response = await axios.post('/api/todos', {
        title: newTitle,
        description: newDescription
      });
      console.log('Created todo:', response.data);
      
      setTodos([response.data, ...todos]);
      setNewTitle('');
      setNewDescription('');
      setError(null);
    } catch (err) {
      console.error('Create error:', err);
      setError('Failed to add todo: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleTodo = async (todo) => {
    try {
      console.log('Toggling todo:', todo.id);
      const response = await axios.put(`/api/todos/${todo.id}`, {
        title: todo.title,
        description: todo.description,
        completed: !todo.completed
      });
      console.log('Updated todo:', response.data);
      
      setTodos(todos.map(t => t.id === todo.id ? response.data : t));
      setError(null);
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update todo: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    try {
      console.log('Deleting todo:', id);
      await axios.delete(`/api/todos/${id}`);
      console.log('Deleted todo:', id);
      
      setTodos(todos.filter(t => t.id !== id));
      setError(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete todo: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Todo App</h1>
        <p>Built with Docker Compose</p>
      </header>
      
      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="container">
        <form onSubmit={addTodo} className="todo-form">
          <h2>Add New Todo</h2>
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="textarea"
            rows="3"
          />
          <button type="submit" className="btn btn-primary">
            Add Todo
          </button>
        </form>

        <div className="todos-section">
          <h2>My Todos ({todos.length})</h2>
          
          {todos.length === 0 ? (
            <div className="no-todos">
              <p>No todos yet!</p>
              <p>Create your first todo above</p>
            </div>
          ) : (
            <div className="todos-list">
              {todos.map(todo => (
                <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo)}
                    className="checkbox"
                  />
                  <div className="todo-content">
                    <h3>{todo.title}</h3>
                    {todo.description && <p>{todo.description}</p>}
                    <small>
                      Created: {new Date(todo.created_at).toLocaleDateString('en-GB')} at{' '}
                      {new Date(todo.created_at).toLocaleTimeString('en-GB')}
                    </small>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="btn-delete"
                    title="Delete todo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>Docker Compose Lab | Multi-container Application</p>
      </footer>
    </div>
  );
}

export default App;