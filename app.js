const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

/*
    End-Point 2: POST /login
    ------------
    To authenticate user based on
    input credentials against the
    ones stored in user table and
    accordingly, allow user to login
    or reject the login request
*/
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const queryToGetRequestedUserData = `
    SELECT *
    FROM user
    WHERE username = '${username}';
    `;

  const requestedUserData = await userDBConnectionObj.get(
    queryToGetRequestedUserData
  );

  if (requestedUserData === undefined) {
    // User not found
    res.status(400);
    res.send("Invalid user");
  } else {
    // Valid user
    const isValidPassword = await bcrypt.compare(
      password,
      requestedUserData.password
    );
    if (isValidPassword) {
      const userIdentifiablePayload = { username };
      const generatedJWT = jwt.sign(
        userIdentifiablePayload,
        "AUTHORIZATION_SECRET"
      );

      res.send("Login success!");
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

/*
    End-Point 3: PUT /change-password
    ------------
    To update user password
*/
app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  const queryToGetRequestedUserData = `
    SELECT *
    FROM user
    WHERE username = '${username}';
    `;

  const requestedUserData = await userDBConnectionObj.get(
    queryToGetRequestedUserData
  );
  if (requestedUserData === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      requestedUserData.password
    );
    if (isOldPasswordValid) {
      if (newPassword.length < 5) {
        res.status(400);
        res.send("Password is too short");
      } else {
        const hashedNewPassword = await bcrypt.hash(
          newPassword,
          saltRoundsForBcryptHashing
        );

        const queryToUpdateUserPassword = `
                UPDATE
                    user
                SET
                    password = '${hashedNewPassword}'
                WHERE
                    username = '${username}';
                `;

        await userDBConnectionObj.run(queryToUpdateUserPassword);
        res.send("Password updated");
      }
    } else {
      res.status(400);
      res.send("Invalid current password");
    }
  }
});

module.exports = app;
