import mysql from 'mysql2/promise';

// Configuração da conexão com o banco de dados MySQL
const pool = mysql.createPool({
    host: 'localhost',  // Se você estiver rodando em um container, use 'mysql' para se referir ao serviço MySQL no docker-compose.
    user: 'unicesumar',  // O usuário configurado no docker-compose.yaml
    password: 'unicesumar',  // A senha configurada no docker-compose.yaml
    database: 'CourseStudentRegistry',  // Nome do banco de dados criado
    waitForConnections: true,  // Mantém conexões ativas
    connectionLimit: 10,  // Limita o número de conexões
    queueLimit: 0  // Número de consultas em espera, 0 significa sem limite
});

export default pool;
