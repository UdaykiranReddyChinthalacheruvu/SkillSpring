CREATE DATABASE IF NOT EXISTS job_matcher CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE job_matcher;

CREATE TABLE IF NOT EXISTS candidates (
    candidate_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id INT PRIMARY KEY AUTO_INCREMENT,
    skill_name VARCHAR(80) NOT NULL UNIQUE
);

-- Only skills in this catalog can be assigned to a candidate profile.
CREATE TABLE IF NOT EXISTS skill_catalog (
    catalog_id INT PRIMARY KEY AUTO_INCREMENT,
    skill_name VARCHAR(80) NOT NULL UNIQUE,
    category VARCHAR(60) NOT NULL
);

INSERT IGNORE INTO skill_catalog (skill_name, category) VALUES
('Java','Programming'),('Python','Programming'),('C','Programming'),('C++','Programming'),('C#','Programming'),
('JavaScript','Programming'),('TypeScript','Programming'),('PHP','Programming'),('R','Programming'),('Kotlin','Programming'),('Go','Programming'),
('HTML','Web development'),('CSS','Web development'),('React','Web development'),('Angular','Web development'),('Vue.js','Web development'),
('Node.js','Web development'),('Express.js','Web development'),('Spring Boot','Web development'),('REST API','Web development'),
('SQL','Databases'),('DBMS','Databases'),('MySQL','Databases'),('PostgreSQL','Databases'),('MongoDB','Databases'),('Oracle Database','Databases'),
('Database Design','Databases'),('Database Normalization','Databases'),
('Git','Tools and platforms'),('GitHub','Tools and platforms'),('Linux','Tools and platforms'),('Docker','Tools and platforms'),
('AWS','Tools and platforms'),('Azure','Tools and platforms'),('Excel','Tools and platforms'),('Power BI','Tools and platforms'),
('Data Structures','Computer science'),('Algorithms','Computer science'),('Object-Oriented Programming','Computer science'),
('Operating Systems','Computer science'),('Computer Networks','Computer science'),('Software Engineering','Computer science'),('Problem Solving','Computer science'),
('Machine Learning','Data and AI'),('Data Analysis','Data and AI'),('Data Visualization','Data and AI'),('Artificial Intelligence','Data and AI'),('TensorFlow','Data and AI'),
('Communication','Professional'),('Teamwork','Professional'),('Leadership','Professional'),('Time Management','Professional'),('Critical Thinking','Professional');

CREATE TABLE IF NOT EXISTS candidate_skills (
    candidate_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (candidate_id, skill_id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
    job_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_skills (
    job_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (job_id, skill_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);
