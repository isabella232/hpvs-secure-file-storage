-- DROP DATABASE secure-file-storage-metadata;
CREATE DATABASE IF NOT EXISTS secure-file-storage-metadata;
-- DROP TABLE files;
CREATE TABLE IF NOT EXISTS files (id UUID PRIMARY KEY, name TEXT, type TEXT, size DECIMAL, createdAt TIMESTAMPTZ DEFAULT current_timestamp, userId TEXT);