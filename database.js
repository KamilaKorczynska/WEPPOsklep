const { Pool } = require('pg');   //PostgreSQL
const bcrypt = require('bcrypt');


const pool = new Pool({
    user: 'postgres',       // Zmień, jeśli masz inną nazwę użytkownika
    host: 'localhost',
    database: 'users',    // Nazwa bazy danych
    password: 'newpassword', // Twoje hasło do PostgreSQL
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
async function addProduct(name, description, price, imageUrl, quantity) {
    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, image_url, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price, imageUrl, quantity]  
        );
        return result.rows[0];
    } catch (error) {
        console.error('Błąd dodawania produktu:', error);
        return null;
    }
}

// Modyfikacja produktu
async function updateProduct(id, name, description, price, imageUrl, quantity) {
    try {
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, image_url = $4, quantity = $5 WHERE id = $6 RETURNING *',
            [name, description, price, imageUrl, quantity, id]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Błąd edytowania produktu:', error);
        return null;
    }
}

// Usuwanie produktu
async function deleteProduct(id) {
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        return result.rows.length > 0;
    } catch (error) {
        console.error('Błąd usuwania produktu:', error);
        return false;
    }
}

async function addToCart(userId, productId, quantity) {
    const existingItem = await pool.query(
        `SELECT * FROM cart WHERE user_id = $1 AND product_id = $2`,
        [userId, productId]
    );

    console.log('Existing Cart Item:', existingItem.rows); 
    if (existingItem.rows.length > 0) {
        await pool.query(
            `UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3`,
            [quantity, userId, productId]
        );
    } else {
        await pool.query(
            `INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)`,
            [userId, productId, quantity]
        );
    }
    return true;
    
}


async function getUserCart(userId) {
    const result = await pool.query(
        `SELECT c.id, c.quantity, p.name, p.price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1`,
        [userId]
    );
    return result.rows;
}

async function updateCartItem(userId, productId, quantity) {
    if (quantity > 0) {
        await pool.query(
            `UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3`,
            [quantity, userId, productId]
        );
    } else {
        await pool.query(
            `DELETE FROM cart WHERE user_id = $1 AND product_id = $2`,
            [userId, productId]
        );
    }
    return true;
}

async function removeFromCart(userId, productId) {
    await pool.query(
        `DELETE FROM cart WHERE user_id = $1 AND product_id = $2`,
        [userId, productId]
    );
    return true;
}


module.exports = { registerUser, loginUser, getUserRoles, editUserRoles, changeUserPassword, registerAdmin, getAllProducts, getProductById, addProduct, updateProduct, deleteProduct, addToCart, getUserCart, updateCartItem, removeFromCart, getUserCart };
