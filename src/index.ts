import express, { Request, Response } from "express";
import path from "path";
import pool from "./config/database";  // Importa o pool de conexões do database.ts
import mysql, { ResultSetHeader } from "mysql2/promise";

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota inicial
app.get('/', (req: Request, res: Response) => {
    res.render('home');
});


// Rota para listar todos os cursos
app.get('/courses', async (req: Request, res: Response) => {
    const [rows] = await pool.query("SELECT * FROM Courses");
    return res.render('courses/index', { courses: rows });
});

// Rota para exibir o formulário de adicionar um curso
app.get('/courses/add', (req: Request, res: Response) => {
    res.render('courses/add');
});

// Rota para processar o formulário de criação de curso
app.post("/courses/add", async (req: Request, res: Response) => {
    const { name, description, duration, price } = req.body;

    const insertQuery = `
        INSERT INTO Courses (name, description, duration, price)
        VALUES (?, ?, ?, ?)
    `;
    await pool.query(insertQuery, [name, description, duration, price]);

    res.redirect("/courses");
});

// src/index.ts

app.get("/courses/:id", async (req: Request, res: Response) => {
    const courseId = req.params.id;
    
    const [courseRows] = await pool.query("SELECT * FROM Courses WHERE course_id = ?", [courseId]);
    const [enrollmentRows] = await pool.query(`
        SELECT s.student_id, s.name FROM Enrollments e
        JOIN Students s ON e.student_id = s.student_id
        WHERE e.course_id = ?
    `, [courseId]);

    res.render("courses/view", {
        course: courseRows[0],
        students: enrollmentRows
    });
});

// Rota para deletar um curso
app.post("/courses/:id/delete", async (req: Request, res: Response) => {
    const id = req.params.id;
    const deleteQuery = "DELETE FROM Courses WHERE course_id = ?";
    await pool.query(deleteQuery, [id]);

    res.redirect("/courses");
});

// Rota para listar todos os alunos
app.get('/students', async (req: Request, res: Response) => {
    const [rows] = await pool.query("SELECT * FROM Students");
    return res.render('students/index', {
        students: rows
    });
});


app.get('/students/add', async (req, res) => {
    try {
        // Query para pegar os cursos da tabela Courses
        const [courses] = await pool.query('SELECT * FROM Courses');
        
        // Verifique se courses é um array
        if (!Array.isArray(courses)) {
            throw new Error('Cursos não foram retornados como array.');
        }

        // Renderize o template 'add.ejs' passando os cursos
        res.render('students/add', { courses });
    } catch (error) {
        console.error('Erro ao carregar a página de adicionar aluno:', error);
        res.status(500).send('Erro ao carregar a página de adicionar aluno.');
    }
});


// Rota para processar o formulário de criação de aluno
app.post("/students/add", async (req: Request, res: Response) => {
    const { name, age, email, courses } = req.body;

    // Insere o aluno no banco de dados
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO Students (name, age, email) VALUES (?, ?, ?)`,
        [name, age, email]
    );

    // Obtém o ID do aluno inserido
    const studentId = result.insertId; // Isso deve funcionar agora

    // Inscreve o aluno nos cursos selecionados
    if (courses && courses.length > 0) {
        const insertEnrollments = `
            INSERT INTO Enrollments (student_id, course_id)
            VALUES (?, ?)
        `;
        const enrollments = courses.map((courseId: string) => [studentId, courseId]);
        await pool.query(insertEnrollments, [studentId, enrollments]);
    }

    res.redirect("/students");
});

app.get("/students/:id", async (req: Request, res: Response) => {
    const studentId = req.params.id;

    // Buscar dados do aluno
    const [studentRows] = await pool.query("SELECT * FROM Students WHERE student_id = ?", [studentId]);
    const student = studentRows[0];

    // Buscar cursos inscritos
    const [coursesRows] = await pool.query(`
        SELECT Courses.name FROM Courses
        JOIN Enrollments ON Courses.course_id = Enrollments.course_id
        WHERE Enrollments.student_id = ?
    `, [studentId]);

    res.render("students/view", { student, courses: coursesRows });
});

// Rota para excluir um aluno e suas inscrições em cursos
app.post('/students/:id/delete', async (req, res) => {
    const studentId = req.params.id;

    try {
        // Exclui as inscrições do aluno da tabela Enrollments
        await pool.query(`
            DELETE E
            FROM Enrollments E
            INNER JOIN Students S ON E.student_id = S.student_id
            WHERE S.student_id = ?
        `, [studentId]);

        // Exclui o aluno da tabela Students
        await pool.query('DELETE FROM Students WHERE student_id = ?', [studentId]);

        // Redireciona para a página de listagem de alunos após exclusão
        res.redirect('/students');
    } catch (error) {
        console.error('Erro ao excluir aluno e inscrições:', error);
        res.status(500).send('Erro ao excluir aluno e suas inscrições.');
    }
});




// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
