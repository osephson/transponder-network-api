import express, { Express } from "express";
import knex from "knex";
import routes from "./routes";

const db = knex({
  client: "sqlite3",
  connection: {
    filename: "./db/transponders.db",
  },
  useNullAsDefault: true,
});

const app: Express = express();
const port = 3000;
app.use(express.json());
routes(app, db);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
