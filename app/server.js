const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./user');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/userdb';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

function layout(title, body, message, isError) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <h1>User Account Data Entry</h1>
    ${message ? `<p class="message${isError ? ' error' : ''}">${message}</p>` : ''}
    ${body}
  </body>
  </html>`;
}

function renderHome(users, message, isError) {
  const rows = users.map(u => `
    <tr>
      <td>${u.fullName}</td>
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${new Date(u.createdAt).toLocaleString()}</td>
      <td class="actions">
        <a class="button-link" href="/users/${u._id}/edit">Edit</a>
        <form method="POST" action="/users/${u._id}/delete">
          <button type="submit" class="danger">Delete</button>
        </form>
      </td>
    </tr>`).join('');

  const body = `
    <form class="card" method="POST" action="/users">
      <label>Full Name</label>
      <input type="text" name="fullName" required>
      <label>Username</label>
      <input type="text" name="username" required>
      <label>Email</label>
      <input type="email" name="email" required>
      <label>Password</label>
      <input type="password" name="password" required>
      <button type="submit">Add User</button>
    </form>
    <h2>Existing Users</h2>
    <table>
      <tr><th>Full Name</th><th>Username</th><th>Email</th><th>Created At</th><th></th></tr>
      ${rows}
    </table>`;

  return layout('User Account Data Entry', body, message, isError);
}

function renderEdit(user, message, isError) {
  const body = `
    <form class="card" method="POST" action="/users/${user._id}">
      <label>Full Name</label>
      <input type="text" name="fullName" value="${user.fullName}" required>
      <label>Username</label>
      <input type="text" name="username" value="${user.username}" required>
      <label>Email</label>
      <input type="email" name="email" value="${user.email}" required>
      <label>Password</label>
      <input type="password" name="password" value="${user.password}" required>
      <div>
        <a class="button-link" href="/">Cancel</a>
        <button type="submit">Save Changes</button>
      </div>
    </form>`;

  return layout('Edit User', body, message, isError);
}

app.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.send(renderHome(users));
});

app.post('/users', async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    await User.create({ fullName, username, email, password });
    res.redirect('/');
  } catch (err) {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(400).send(renderHome(users, `Error: ${err.message}`, true));
  }
});

app.get('/users/:id/edit', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.redirect('/');
  res.send(renderEdit(user));
});

app.post('/users/:id', async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, username, email, password },
      { new: true, runValidators: true }
    );
    res.redirect('/');
  } catch (err) {
    const user = await User.findById(req.params.id);
    res.status(400).send(renderEdit(user, `Error: ${err.message}`, true));
  }
});

app.post('/users/:id/delete', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

app.get('/api/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`User account app listening on port ${PORT}`));
