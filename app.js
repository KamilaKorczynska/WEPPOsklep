var http = require('http');
var authorize = require('./authorize')  
var express = require('express');
var cookieParser = require('cookie-parser');
var {pool, registerUser, loginUser, getUserRoles, editUserRoles, changeUserPassword, registerAdmin, getAllProducts, getProductById, addProduct, updateProduct, deleteProduct, getUserCart, addToCart, getUserByUsername, updateCartItem, removeFromCart 
        , getCartItemById

} = require('./database');

var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('sgs90890s8g90as8rg90as8g9r8a0srg8'));

app.set('view engine', 'ejs');
app.set('views', './views');


// PRZEKIEROWANIE z '/' na '/home' dla każdego
app.get('/', (req, res) => {
    res.redirect('/home');
});

// Strona dostępna dla wszystkich
app.get('/home', async (req, res) => {
    let role = [];
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    res.render('home', { user: req.signedCookies.user || null, role });
});


// strona logowania
app.get( '/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    var username = req.body.txtUser;
    var pwd = req.body.txtPwd;

    var user = await loginUser(username, pwd);

    if (user) {
        res.cookie('user', username, { signed: true });
        res.redirect(req.query.returnUrl || '/home');
    } else {
        res.render('login', { message: "Zła nazwa logowania lub hasło" });
    }
});

// Strona rejestracji
app.get('/register', (req, res) => {
    res.render('register');
});
  
// Obsługa rejestracji
app.post('/register', async (req, res) => {
    var username = req.body.txtUser;
    var pwd1 = req.body.txtPwd1;
    var pwd2 = req.body.txtPwd2;

    // Sprawdzenie, czy hasła są takie same
    if (pwd1 !== pwd2) {
        return res.render('register', { message: "Hasła nie są takie same. Proszę spróbować ponownie." });
    }

    var newUser = await registerUser(username, pwd1);

    if (newUser) {
        res.cookie('user', username, { signed: true });
        res.redirect('/home');
    } else {
        res.render('register', { message: "Błąd rejestracji. Użytkownik może już istnieć." });
    }
});

// Wylogowanie
app.get( '/logout', authorize(), (req, res) => {
    res.cookie('user', '', { maxAge: -1 } );
    res.redirect('/')
});

// Strona konta
app.get('/account', authorize(), async (req, res) => {
    let role = [];
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    res.render('account', { user: req.signedCookies.user || null, role });
});

// Strona zmiany hasła
app.get('/changePassword', authorize(), (req, res) => {
    res.render('changePassword');
});

app.post('/changePassword', authorize(), async (req, res) => {
    const { txtOldPwd, txtNewPwd1, txtNewPwd2 } = req.body;

    if (txtNewPwd1 !== txtNewPwd2) {
        return res.render('changePassword', { message: "Nowe hasła muszą być takie same." });
    }

    const user = await loginUser(req.signedCookies.user, txtOldPwd);
    if (!user) {
        return res.render('changePassword', { message: "Stare hasło jest niepoprawne." });
    }

    const updatedUser = await changeUserPassword(req.signedCookies.user, txtNewPwd1);
    if (updatedUser) {
        return res.redirect('/account');
    } else {
        return res.render('changePassword', { message: "Wystąpił błąd podczas zmiany hasła." });
    }
});



// Strona listy produktów
app.get('/products', async (req, res) => {
    let role = [];
    let isAdmin = false;
    let searchQuery = req.query.search ? req.query.search.trim() : ''; // Pobranie i usunięcie białych znaków
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
        if (role.includes('admin')) {
            isAdmin = true;
        }
    }
    let products;
    if (searchQuery) {
        // Zapytanie SQL zwracające tylko produkty, które zawierają szukane słowo
        products = await pool.query("SELECT * FROM products WHERE LOWER(name) LIKE LOWER($1)", [`%${searchQuery}%`]);
        products = products.rows;
    } else {
        products = await getAllProducts();
    }
    res.render('products', { products, user: req.signedCookies.user || null, role, isAdmin, searchQuery });
});


// Strona konkretnego produktu
app.get('/product/:id', async (req, res) => {
    let role = [];
    let isAdmin = false; // Dodajemy zmienną do sprawdzenia roli admina
    
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
        // Sprawdzamy, czy wśród ról użytkownika jest "admin"
        if (role.includes('admin')) {
            isAdmin = true;
        }
    }

    const product = await getProductById(req.params.id);
    if (!product) {
        return res.status(404).send('Produkt nie znaleziony');
    }
    res.render('product', { product, user: req.signedCookies.user || null, role, isAdmin });
});

// Strona dodawania produktu (tylko dla adminów)
app.get('/addProduct', authorize('admin'), async (req, res) => {

    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }

    res.render('addProduct', { user: req.signedCookies.user || null, role });
});

// Obsługa dodawania produktu
app.post('/addProduct', authorize('admin'), async (req, res) => {
    
    const { name, description, price, imageUrl, quantity } = req.body;  
    if (!name || !price || !quantity) {  
        return res.render('addProduct', {
            message: "Nazwa, cena i ilość są wymagane.",
            user: req.signedCookies.user
        });
    }

    const newProduct = await addProduct(name, description, price, imageUrl, quantity);  
    if (newProduct) {
        res.redirect('/products');
    } else {
        res.render('addProduct', {
            message: "Błąd dodawania produktu.",
            user: req.signedCookies.user
        });
    }
});

// Strona edycji produktu (tylko dla adminów)
app.get('/editProduct/:id', authorize('admin'), async (req, res) => {

    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    
    const product = await getProductById(req.params.id);
    if (!product) {
        return res.status(404).send('Produkt nie znaleziony');
    }
    res.render('editProduct', { product, user: req.signedCookies.user || null, role });
});

// Obsługa edycji produktu
app.post('/editProduct/:id', authorize('admin'), async (req, res) => {
    const { name, description, price, imageUrl, quantity } = req.body;
    const updatedProduct = await updateProduct(req.params.id, name, description, price, imageUrl, quantity);
    if (updatedProduct) {
        res.redirect('/products');
    } else {
        res.render('editProduct', { message: "Błąd edytowania produktu.", product: req.body });
    }
});

// Obsługa usuwania produktu
app.post('/deleteProduct/:id', authorize('admin'), async (req, res) => {
    const deleted = await deleteProduct(req.params.id);
    if (deleted) {
        res.redirect('/products');
    } else {
        res.status(500).send('Błąd usuwania produktu');
    }
});

app.post('/cart/add', authorize(), async (req, res) => {
    const { product_id } = req.body;
    const user = await getUserByUsername(req.signedCookies.user);
    
    if (!user) {
        return res.redirect('/login');
    }

    const product = await getProductById(product_id);

    try {
        await addToCart(user.id, product_id, 1);
        res.redirect('/cart');
    } catch (error) {
        return res.status(400).send(error.message);
    }
});





app.get('/cart', async (req, res) => {
    let role = [];
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }

    try {
        const user = await getUserByUsername(req.signedCookies.user);
        
        if (!user) {
            return res.redirect('/login');
        }
        const cartItems = await getUserCart(user.id); 
        res.render('cart', { cartItems, user: user.username, role: user.roles });
    } catch (err) {
        console.error('Error fetching cart items:', err);
        res.render('cart', { cartItems: [], user: null, role}); 
    }
});

app.post('/cart/update', authorize(), async (req, res) => {
    const { cartItemId, quantity } = req.body;
    
    const cartItem = await getCartItemById(cartItemId);
    const product = await getProductById(cartItem.product_id);
    
    if (quantity > product.quantity) {
        //return res.status(400).send('Nie możesz zamówić więcej, niż jest dostępne w magazynie');
        const user = await getUserByUsername(req.signedCookies.user);
        const cartItems = await getUserCart(user.id);
        return res.render('cart', { 
            cartItems, 
            user: user.username, 
            role: user.roles, 
            message: `Nie możesz zamówić więcej niż ${product.quantity} sztuk ${product.name}.` 
        });
    }
    
    const updatedItem = await updateCartItem(cartItemId, quantity);
    
    if (!updatedItem) {
        return res.status(500).send('Błąd aktualizacji koszyka');
    }

    res.redirect('/cart');
});

app.post('/cart/remove', authorize(), async (req, res) => {
    const { cartItemId } = req.body; // pobieramy ID przedmiotu
    const success = await removeFromCart(cartItemId);

    if (!success) {
        return res.status(500).send('Błąd usuwania przedmiotu z koszyka');
    }

    res.redirect('/cart');
});


http.createServer(app).listen(3000);
console.log('serwer działa, nawiguj do http://localhost:3000');