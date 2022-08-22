const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const saltRoundsForBcryptHashing = 15;

const userDataFilePath = path.join(__dirname, "userData.db");
const sqliteDriver = sqlite3.Database;

let userDBConnectionObj = null;

const initializeDBAndServer = async () => {
  try {
    userDBConnectionObj = await open({
      filename: userDataFilePath,
      driver: sqliteDriver,
    });

    app.listen(3000, () => {
      console.log("Server running and listening on port 3000 !");
      console.log("Base URL - http://localhost:3000");
    });
  } catch (exception) {
    console.log(`Error initializing database or server: ${exception.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

/*
    End-Point 1: POST /register
    ------------
    To register/add new user to
    the user table. Runs checks
    on input user data and accordingly
    sends appropriate responses.
*/
app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const queryToGetExistingUserData = `
    SELECT *
    FROM user
    WHERE username = '${username}';
    `;

  const existingUserData = await userDBConnectionObj.get(
    queryToGetExistingUserData
  );

  if (existingUserData === undefined) {
    // Indeed a new user, as there is no existing
    // user with the input username.

    if (password.length < 5) {
      res.status(400);
      res.send("Password is too short");
    } else {
      // Without else, code within
      // this block will be executed
      // even after the response is sent
      // for shorter passwords in the if-block.
      const hashedPassword = await bcrypt.hash(
        password,
        saltRoundsForBcryptHashing
      );
      const queryToAddNewUser = `
        INSERT INTO
            user (username, name, password, gender, location)
        VALUES
            ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');
        `;

      const addNewUserDBResponse = await userDBConnectionObj.run(
        queryToAddNewUser
      );
      res.send("User created successfully");
    }
  } else {
    // User exists with input username
    res.status(400);
    res.send("User already exists");
  }
});

module.exports = app;
