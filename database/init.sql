-- Lubame UUID-d kasutada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Loome tabeli
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test andmed
INSERT INTO todos (title, description) VALUES 
    ('Õpi Docker Compose', 'Multi-container rakendus'),
    ('Tee kodutöö', 'Labori ülesanded'),
    ('Test rakendust', 'Kontrolli et kõik töötab');