// ESM imports
import express from "express";
import bodyParser from "body-parser";           // default import
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import session from "express-session";          // for flash messages

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Remove unused text import - we only need urlencoded for form data

const app = express();
const PORT = 3000;

// view engine (optional but correct for res.render)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware for flash messages
app.use(session({
  secret: 'your-secret-key-here', // Change this to a secure secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 } // 1 minute
}));







// Simple flash message middleware
app.use((req, res, next) => {
  res.locals.successMessage = req.session.successMessage;
  res.locals.errorMessage = req.session.errorMessage;
  delete req.session.successMessage;
  delete req.session.errorMessage;
  next();
});





// Error handling middleware for multer file upload errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send('File too large. Maximum size is 5MB.');
    }
  }
  next(error);
});





// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "public", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});



// accept images only
const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image uploads are allowed"));
};




const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});


// ---- Articles store (2 defaults) ----
let articles = [
  {
    id: 1,
    title: "Valorant",
    brief: "A tactical shooter that blends strategy and individuality.",
    article:
      "Valorant is more than a game—it’s a stage where intellect meets reflex. Developed by Riot Games, it merges the razor-sharp precision of classic shooters with a modern, ability-driven system that gives each player a distinct role. Agents wield unique powers that can shift the tide of battle, demanding a balance between gunplay and tactical decision-making. Whether you’re setting traps, creating smokescreens, or leading an assault, every move in Valorant feels purposeful. Its constantly evolving roster, frequent updates, and thriving esports scene have helped it build one of the most passionate communities in gaming today, proving that success isn’t only about aim—it’s about adaptability, teamwork, and timing.",
    imageUrl: "/images/hero.png",
    createdAt: new Date()
  },
  {
    id: 2,
    title: "Apex Legends",
    brief: "Fast movement, ping system, and hero abilities.",
    article:
      "Apex Legends stands as a bold reinvention of the battle royale formula. Developed by Respawn Entertainment, it emphasizes speed, teamwork, and dynamic character abilities that make every round unpredictable. Players drop into vast, visually stunning arenas as unique “Legends,” each equipped with distinct powers that encourage collaboration and tactical diversity. Movement is key — from sliding down hills to scaling walls — making each encounter cinematic and exhilarating. What sets Apex apart is its seamless communication system, allowing even strangers to strategize effectively. Over the years, its evolving storylines and seasonal updates have built a living world that feels alive and connected. Apex Legends is more than a shooter — it’s a showcase of precision, personality, and persistence.",
    imageUrl: "/images/apex.jpg",
    createdAt: new Date()
  },
  {
    id: 3,
    title: "Rainbow Six Siege",
    brief: "An intense, close-quarters experience that rewards patience, teamwork, and tactical execution.",
    article:
      "Rainbow Six Siege redefined how we think about multiplayer shooters. Instead of fast chaos, it delivers slow, calculated tension — every step, every sound, every wall breach matters. Teams of attackers and defenders face off in destructible environments, where the battlefield changes with every decision. Each operator brings unique gadgets and skills that can reinforce defenses or create openings for breakthroughs. The game’s complexity rewards those who communicate, plan, and stay calm under pressure. Siege’s focus on realism and precision has earned it a loyal fanbase and a respected place in esports. It isn’t just about who shoots first — it’s about who thinks faster, adapts better, and executes smarter.",
    imageUrl: "/images/rainbow.jpg",
    createdAt: new Date()
  }
];

// Calculate next ID based on the highest existing ID to avoid conflicts
let nextId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;






// routes
app.get("/", (req, res) => {
  res.render("index.ejs", { title: "Home Page", articles });
});

app.get("/compose", (req, res) => {
  // Render compose page with articles data for the article management section
  res.render("compose.ejs", { title: "Compose Page", articles });
});

app.get("/about", (req, res) => {
  res.render("about.ejs", { title: "About Page" });
});

app.get("/Article", (req, res) => {
  res.render("Article.ejs", { title: "Article Page" });
});





app.get("/articles/:id", (req, res) => {
const id = Number(req.params.id);
const item = articles.find(a => a.id === id); 
//Looks inside the articles array to find the article that matches the given id.
// .find() goes through every element (a) and returns the first one where the condition is true.
// The condition here: a.id === id
// means “find the article whose id equals the number from the URL.”
// 
if(!item) return res.status(404).send("Article not found");
 res.render("Article.ejs", { title: item.title, article: item });
});






app.post("/submit", upload.single("image"), (req, res) => {
  const { title, article, brief } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if(!title?.trim() || !brief?.trim() || !article?.trim()) {
    return res.status(400).send("Title, brief, and article are required.");
  }
  const newItem = {
    id: nextId++,
    title: title.trim(),
    brief: brief.trim(),
    article: article.trim(),
    imageUrl,
    createdAt: new Date()
  };

  articles.push(newItem);

  // Set success message for user feedback
  req.session.successMessage = 'Article created successfully!';
  res.redirect('/articles/' + newItem.id);
});






// GET route to show edit form for a specific article
app.get("/articles/:id/edit", (req, res) => {
  const id = Number(req.params.id);
  const article = articles.find(a => a.id === id);
  
  // Check if article exists
  if (!article) {
    return res.status(404).send("Article not found");
  }
  
  // Render edit page with article data pre-filled
  res.render("edit.ejs", { title: "Edit Article", article });
});





// PUT/POST route to update an existing article
app.post("/articles/:id/update", upload.single("image"), (req, res) => {
  const id = Number(req.params.id);
  const { title, article, brief } = req.body;
  
  // Find the article to update
  const articleIndex = articles.findIndex(a => a.id === id);
  
  // Check if article exists
  if (articleIndex === -1) {
    return res.status(404).send("Article not found");
  }
  
  // Validate required fields
  if (!title?.trim() || !brief?.trim() || !article?.trim()) {
    return res.status(400).send("Title, brief, and article are required.");
  }
  
  // Update article data
  articles[articleIndex].title = title.trim();
  articles[articleIndex].brief = brief.trim();
  articles[articleIndex].article = article.trim();
  
  // Update image only if a new one was uploaded
  if (req.file) {
    articles[articleIndex].imageUrl = `/uploads/${req.file.filename}`;
  }
  
  // Update the modification timestamp
  articles[articleIndex].updatedAt = new Date();
  
  // Set success message for user feedback
  req.session.successMessage = 'Article updated successfully!';
  
  // Redirect to the updated article
  res.redirect('/articles/' + id);
});






// DELETE route to remove an article
app.post("/articles/:id/delete", (req, res) => {
  const id = Number(req.params.id);
  
  // Find the article index
  const articleIndex = articles.findIndex(a => a.id === id);
  
  // Check if article exists
  if (articleIndex === -1) {
    return res.status(404).send("Article not found");
  }
  
  // Remove the article from the array
  articles.splice(articleIndex, 1);
  
  // Set success message for user feedback
  req.session.successMessage = 'Article deleted successfully!';
  
  // Redirect to home page after deletion
  res.redirect('/');
});

// start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
