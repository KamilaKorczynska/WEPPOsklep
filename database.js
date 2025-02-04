const { Pool } = require('pg');   //PostgreSQL
const bcrypt = require('bcrypt');


const pool = new Pool({
    user: 'postgres',       // Zmień, jeśli masz inną nazwę użytkownika
    host: 'localhost',
    database: 'usersdb',    // Nazwa bazy danych
    password: '90603888', // Twoje hasło do PostgreSQL
    port: 5432,
});

// Rejestracja użytkownika
async function registerUser(username, password, roles = ['user']) {
    const hashedPassword = await bcrypt.hash(password, 12);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, roles) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, roles]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Błąd rejestracji:', error);
        return null;
    }
}

// Logowanie użytkownika
async function loginUser(username, password) {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return null; // Użytkownik nie istnieje
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            return user; // Zwraca użytkownika, jeśli hasło jest poprawne
        } else {
            return null; // Złe hasło
        }
    } catch (error) {
        console.error('Błąd logowania:', error);
        return null;
    }
}

// Pobieranie roli użytkownika
async function getUserRoles(username) {
    try {
        const result = await pool.query(
            'SELECT roles FROM users WHERE username = $1',
            [username]
        );
        return result.rows.length > 0 ? result.rows[0].roles : [];
    } catch (error) {
        console.error('Błąd pobierania ról:', error);
        return [];
    }
}


// Edytowanie ról użytkownika
async function editUserRoles(username, newRoles) {
    try {
        // Zaktualizowanie ról w bazie danych
        const result = await pool.query(
            'UPDATE users SET roles = $1 WHERE username = $2 RETURNING *',
            [newRoles, username]
        );

        if (result.rows.length === 0) {
            console.log('Użytkownik nie znaleziony');
            return null;
        }

        return result.rows[0];  // Zwróć zaktualizowanego użytkownika
    } catch (error) {
        console.error('Błąd edytowania ról:', error);
        return null;
    }
}


// Zmiana hasła użytkownika
async function changeUserPassword(username, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    try {
        // Zaktualizowanie hasła użytkownika w bazie danych
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2 RETURNING *',
            [hashedPassword, username]
        );

        if (result.rows.length === 0) {
            console.log('Użytkownik nie znaleziony');
            return null;
        }

        return result.rows[0];  // Zwróć użytkownika po zaktualizowaniu hasła
    } catch (error) {
        console.error('Błąd zmiany hasła:', error);
        return null;
    }
}


// Rejestrowanie Admina
async function registerAdmin(username='admin123', password='admin123', roles = ['admin']) {
    const hashedPassword = await bcrypt.hash(password, 12);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, roles) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, roles]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Błąd rejestracji:', error);
        return null;
    }
}


// Pobieranie wszystkich produktów
async function getAllProducts() {
    try {
        const result = await pool.query('SELECT * FROM products');
        return result.rows;
    } catch (error) {
        console.error('Błąd pobierania produktów:', error);
        return [];
    }
}

// Pobieranie jednego produktu po ID
async function getProductById(productId) {
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Błąd pobierania produktu:', error);
        return null;
    }
}

// Dodawanie nowego produktu
async function addProduct(name, description, price, imageUrl) {
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, price, imageUrl]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Błąd dodawania produktu:', error);
        return null;
    }
}

module.exports = {registerUser, loginUser, getUserRoles, editUserRoles, changeUserPassword, registerAdmin, getAllProducts, getProductById, addProduct };