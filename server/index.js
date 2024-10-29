import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import OAuth2Strategy from "passport-google-oauth20";

import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import { addDummyAdmin } from "./controller/adminController.js";
import Admin from "./models/admin.js"; // Import Admin model
import Faculty from "./models/faculty.js"; // Import Faculty model
import Student from "./models/student.js"; // Import Student model

const app = express();
dotenv.config();

const clientid = process.env.GOOGLE_CLIENT_ID;
const clientsecret = process.env.GOOGLE_CLIENT_SECRET;
// Middleware setup
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
passport.use(
  new OAuth2Strategy(
    {
      clientID: clientid,
      clientSecret: clientsecret,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("profile",profile,done);
      try {
        // Check if the user already exists in Admin
        let user = await Admin.findOne({ email: profile.emails[0].value });

        if (!user) {
          // Check if the user already exists in Faculty
          user = await Faculty.findOne({ email: profile.emails[0].value });
        }

        if (!user) {
          // Check if the user already exists in Student
          user = await Student.findOne({ email: profile.emails[0].value });
        }

        if (!user) {
          // If user does not exist, create a new Admin by default (you can adjust this logic)
          user = await Admin.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value // Optional: Add avatar if you want
            // Add other fields as necessary
          });
        }

        // Call done with the user object
        done(null, user);
      } catch (error) {
        console.error("Error finding or creating user:", error);
        done(error, null);
      }
    }
  )
);

// Serialize user to the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);

// Google authentication routes
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

app.get("/auth/google/callback",passport.authenticate("google",{
  failureRedirect: "http://localhost:3000/login"
}), async (req, res) => {
  // Check the user's role and redirect accordingly
  if (req.user) {
    const user = req.user;

    if (user instanceof Admin) {
      // Redirect to admin home
      return res.redirect("http://localhost:3000/admin/home");
    } else if (user instanceof Faculty) {
      // Redirect to faculty home
      return res.redirect("http://localhost:3000/faculty/home");
    } else if (user instanceof Student) {
      // Redirect to student home
      return res.redirect("http://localhost:3000/student/home");
    }
  }

  // Fallback redirect
  res.redirect("http://localhost:3000/login");
});

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
mongoose.set('strictQuery', false);
mongoose.connect(process.env.CONNECTION_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("MongoDB connected successfully.");
  addDummyAdmin(); // Add dummy admin if needed
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((error) => console.log("MongoDB connection error:", error.message));
