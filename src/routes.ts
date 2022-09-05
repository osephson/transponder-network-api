import { Express, Request, Response } from "express";
import { Knex } from "knex";

export type BaseTransponder = {
  id: number;
  name: string;
  childId: number;
};

export type Transponder = {
  id: number;
  name: string;
  children: Array<number | Transponder>;
};

const aggregateChildren = (transponders: Array<BaseTransponder>) => {
  const tMap = new Map<number, Transponder>();
  for (let transponder of transponders) {
    if (!tMap.has(transponder.id)) {
      tMap.set(transponder.id, {
        id: transponder.id,
        name: transponder.name,
        children: [],
      });
    }

    const item = tMap.get(transponder.id);
    if (transponder.childId) item?.children.push(transponder.childId);
  }
  return tMap;
};

const getTransponderMap = async (db: Knex) => {
  const transponders = await db<BaseTransponder>("transponders")
    .select("transponders.id", "name", "childId")
    .leftJoin(
      "transponder_relations",
      "transponders.id",
      "transponder_relations.parentId"
    );

  return aggregateChildren(transponders);
};

const extend = (transponderMap: Map<number, Transponder>) => {
  for (let transponder of transponderMap.values()) {
    for (let i = 0; i < transponder.children.length; i++) {
      const child = transponder.children[i];
      if (typeof child === "number") {
        transponder.children[i] = transponderMap.get(child) as Transponder;
      }
    }
  }
};

const routes = (app: Express, db: Knex) => {
  app.get("/", (_req, res) => {
    res.send("Welcome to Beezwax satelite api server!");
  });

  app.get("/transponders", async (_req, res: Response) => {
    const transponderMap = await getTransponderMap(db);
    const parentIds: Array<number> = await db("transponders")
      .whereNotIn("id", db.select("childId").from("transponder_relations"))
      .pluck("id");

    extend(transponderMap);

    const transponders = parentIds.map((id) => transponderMap.get(id));
    res.json({ transponders });
  });

  app.get("/count/:id?", async (req: Request, res: Response) => {
    const id = +req.params.id;
    const transponderMap = await getTransponderMap(db);

    if (transponderMap.has(id)) return res.json({ count: transponderMap.get(id)?.children.length });
    return res.json({ count: transponderMap.size });
  });
};

export default routes;
