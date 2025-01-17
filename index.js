import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {clash} from "./middleware/logic.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3008;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


// Endpoint to check for clashes
app.post("/check-clash", async (req, res) => {
        clash(req.body).then((message)=>{
            res.json(message);
        }).catch((message)=>{
            res.status(500).json({error: message});
        });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
