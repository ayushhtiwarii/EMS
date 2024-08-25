const http = require('http');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(__dirname, 'employees.txt');
const usersFilePath = path.join(__dirname, 'users.txt'); // New file for storing user credentials

// Load users from text file
function loadUsers() {
    if (fs.existsSync(usersFilePath)) {
        const data = fs.readFileSync(usersFilePath, 'utf-8');
        return data.trim().split('\n').map(line => {
            const [username, password] = line.split('|');
            return { username, password };
        });
    }
    return [];
}

// Save users to text file
function saveUsers(users) {
    const data = users.map(user => `${user.username}|${user.password}`).join('\n');
    fs.writeFileSync(usersFilePath, data, 'utf-8');
}

let employees = loadEmployees();
let users = loadUsers();

// Simple session management
let session = {};

function loadEmployees() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        return data.trim().split('\n').map((line) => {
            const [id, name, role, salary] = line.split('|');
            return { id: parseInt(id), name, role, salary: parseInt(salary) };
        });
    }
    return [];
}

function saveEmployees(employees) {
    const data = employees.map(emp => `${emp.id}|${emp.name}|${emp.role}|${emp.salary}`).join('\n');
    fs.writeFileSync(dataFilePath, data, 'utf-8');
}

function displayLogin(req, res) {
    const html = `
    <html>
      <head>
        <title>Login</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(120deg, #3498db, #8e44ad); 
            height: 100vh; 
            display: flex; 
            justify-content: center; 
            align-items: center;
          }
          .container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .container h1 { text-align: center; }
          .container form { text-align: center; }
          .container input { margin: 10px 0; padding: 10px; width: 100%; }
          .container button {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px;
            width: 100%;
            border-radius: 5px;
            cursor: pointer;
          }
          .container button:hover { background: #2980b9; }
          .container a { display: block; margin-top: 10px; text-align: center; color: #3498db; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Login</h1>
          <form method="POST" action="/login">
            <input type="text" name="username" placeholder="Username" required><br>
            <input type="password" name="password" placeholder="Password" required><br>
            <button type="submit">Login</button>
            <a href="/signup">Sign Up</a>
          </form>
        </div>
      </body>
    </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

function displaySignup(req, res) {
    const html = `
    <html>
      <head>
        <title>Sign Up</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(120deg, #3498db, #8e44ad); 
            height: 100vh; 
            display: flex; 
            justify-content: center; 
            align-items: center;
          }
          .container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .container h1 { text-align: center; }
          .container form { text-align: center; }
          .container input { margin: 10px 0; padding: 10px; width: 100%; }
          .container button {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px;
            width: 100%;
            border-radius: 5px;
            cursor: pointer;
          }
          .container button:hover { background: #2980b9; }
          .container a { display: block; margin-top: 10px; text-align: center; color: #3498db; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Sign Up</h1>
          <form method="POST" action="/signup">
            <input type="text" name="username" placeholder="Username" required><br>
            <input type="password" name="password" placeholder="Password" required><br>
            <button type="submit">Sign Up</button>
            <a href="/login">Back to Login</a>
          </form>
        </div>
      </body>
    </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

function handleLogin(req, res) {
    parsePostData(req, (postData) => {
        const { username, password } = postData;

        // Simple authentication check
        const user = users.find(user => user.username === username && user.password === password);
        if (user) {
            session.isAuthenticated = true;
            res.writeHead(302, { 'Location': '/' });
            res.end();
        } else {
            res.writeHead(401, { 'Content-Type': 'text/html' });
            res.end('<h1>401 Unauthorized</h1><p>Invalid credentials</p>');
        }
    });
}

function handleSignup(req, res) {
    parsePostData(req, (postData) => {
        const { username, password } = postData;

        // Check if user already exists
        if (users.some(user => user.username === username)) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>400 Bad Request</h1><p>Username already exists</p>');
            return;
        }

        // Add new user and save to file
        users.push({ username, password });
        saveUsers(users);
        res.writeHead(302, { 'Location': '/login' });
        res.end();
    });
}

function displayEmployees(req, res) {
    if (!session.isAuthenticated) {
        res.writeHead(302, { 'Location': '/login' });
        res.end();
        return;
    }

    const html = `
    <html>
      <head>
        <title>Employee Salary Management</title>
        <style>
          body { margin: 0; padding: 0; background-color: #f9f9f9; }
          .container { width: 80%; margin: auto; overflow: hidden; }
          header { background: #333; color: #fff; padding: 10px 0; text-align: center; }
          table { width: 100%; margin: 20px 0; border-collapse: collapse; }
          table, th, td { border: 1px solid #ddd; }
          th, td { padding: 8px; text-align: left; }
          th { background-color: #333; color: white; }
          a { display: inline-block; margin: 10px 0; padding: 10px 20px; background: #4CAF50; color: #fff; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <header>
          <h1>Employee Salary Management</h1>
        </header>
        <div class="container">
          <h1>Employee List</h1>
          <table>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Salary</th>
            </tr>
            ${employees.map((employee) => `
              <tr>
                <td>${employee.id}</td>
                <td>${employee.name}</td>
                <td>${employee.role}</td>
                <td>${employee.salary}</td>
              </tr>
            `).join('')}
          </table>
          <a href="/add">Add Employee</a>
          <a href="/update">Update Employee</a>
          <a href="/delete">Delete Employee</a>
        </div>
      </body>
    </html>
    `;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}

function parsePostData(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        callback(querystring.parse(body));
    });
}

function handleRequest(req, res) {
    const urlParts = url.parse(req.url);

    switch (urlParts.pathname) {
        case '/':
            displayEmployees(req, res);
            break;
        case '/login':
            if (req.method === 'POST') {
                handleLogin(req, res);
            } else {
                displayLogin(req, res);
            }
            break;
        case '/signup':
            if (req.method === 'POST') {
                handleSignup(req, res);
            } else {
                displaySignup(req, res);
            }
            break;
        case '/add':
            // Add your existing logic for adding an employee here
            break;
        case '/update':
            // Add your existing logic for updating an employee here
            break;
        case '/delete':
            // Add your existing logic for deleting an employee here
            break;
        default:
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            break;
    }
}

const server = http.createServer(handleRequest);

server.listen(8080, () => {
    console.log('Server running on port 8080');
});
