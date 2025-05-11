-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing diagram embeddings
CREATE TABLE IF NOT EXISTS diagram_embeddings (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    description TEXT,
    raw_text TEXT NOT NULL,
    diagram_type TEXT NOT NULL,
    diagram_json JSONB NOT NULL,
    embedding VECTOR(1536)  -- OpenAI embedding dimension
);

-- Create table for storing SysML templates
CREATE TABLE IF NOT EXISTS sysml_templates (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    template_name TEXT NOT NULL,
    template_description TEXT,
    template_type TEXT NOT NULL,
    template_json JSONB NOT NULL
);

-- Create table for storing UAV components
CREATE TABLE IF NOT EXISTS uav_components (
    id SERIAL PRIMARY KEY,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL,
    component_description TEXT,
    properties JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS diagram_type_idx ON diagram_embeddings (diagram_type);
CREATE INDEX IF NOT EXISTS template_type_idx ON sysml_templates (template_type);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS embedding_idx ON diagram_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Insert sample templates
INSERT INTO sysml_templates (template_name, template_description, template_type, template_json)
VALUES 
    ('UAV Sensor System', 'Template for UAV sensor systems for disaster management', 'block', 
    '{"diagram_type":"block","elements":[{"id":"sensor1","type":"block","name":"Thermal Sensor","description":"Detects heat signatures from survivors"},{"id":"processor1","type":"block","name":"Image Processor","description":"Processes thermal imagery data"},{"id":"transmitter1","type":"block","name":"Data Transmitter","description":"Sends processed data to ground station"}],"relationships":[{"source_id":"sensor1","target_id":"processor1","type":"flow","name":"Raw Thermal Data"},{"source_id":"processor1","target_id":"transmitter1","type":"flow","name":"Processed Detection Data"}]}'),
    
    ('Flood Monitoring Workflow', 'Workflow for monitoring and response to flood emergencies', 'activity',
    '{"diagram_type":"activity","elements":[{"id":"act1","type":"activity","name":"Scan Flood Zone","description":"UAV scans flooded areas using sensors"},{"id":"act2","type":"activity","name":"Identify Survivors","description":"AI processes imagery to locate survivors"},{"id":"act3","type":"activity","name":"Alert Response Team","description":"Send alerts to emergency responders"}],"relationships":[{"source_id":"act1","target_id":"act2","type":"flow","name":"Sensor Data"},{"source_id":"act2","target_id":"act3","type":"flow","name":"Location Data"}]}');

-- Insert sample UAV components
INSERT INTO uav_components (component_name, component_type, component_description, properties)
VALUES
    ('Thermal Camera', 'sensor', 'Infrared camera for detecting heat signatures', '{"resolution": "640x480", "sensitivity": "0.05°C", "weight": "120g"}'),
    ('GPS Module', 'sensor', 'High-precision GPS for positioning', '{"accuracy": "±1.5m", "update_rate": "10Hz", "weight": "35g"}'),
    ('Image Processor', 'processor', 'Embedded system for real-time image analysis', '{"processor": "Jetson Nano", "memory": "4GB", "power_consumption": "5-10W"}'),
    ('Radio Transmitter', 'communication', 'Long-range transmitter for data relay', '{"range": "10km", "frequency": "2.4GHz", "power_output": "100mW"}');
