const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uh9rxet.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        const racipesCollection = client.db('sumuscuisine').collection('racipes');
        const usersCollection = client.db('sumuscuisine').collection('users');
        const reviewsCollection = client.db('sumuscuisine').collection('reviews');

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = {
                email: user.email
            }
            const checkUser = await usersCollection.findOne(query);
            if (checkUser) {
                return res.status(409).send({ message: "user already exits" })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.get("/cakes", async (req, res) => {
            const httpQuery = parseInt(req.query.limit)
            const query = {};

            if (httpQuery) {
                const result = await racipesCollection.find(query, { limit: httpQuery }).toArray();
                return res.send(result);
            }

            const result = await racipesCollection.find(query).toArray();
            res.send(result)
        })

        app.get("/cake/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await racipesCollection.findOne(query);
            res.send(result)
        })

        app.post("/cakes", verifyJWT, async (req, res) => {
            const racipe = req.body
            const result = await racipesCollection.insertOne(racipe);
            res.send(result)
        })

        app.get("/reviews/cake/:id", async (req, res) => {
            const cakeId = req.params.id;
            const query = { cake: cakeId };
            const result = await reviewsCollection.find(query).sort({ createdAt: -1 }).toArray();
            res.send(result)
        })

        app.get("/reviews/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { 'createdBy.email': email };
            const result = await reviewsCollection.find(query).sort({ createdAt: -1 }).toArray();
            res.send(result)
        })

        app.post("/reviews", verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result)
        })

        app.put("/reviews/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const review = req.body
            const query = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: review
            }
            const result = await reviewsCollection.updateOne(query, updatedDoc, options)
            res.send(result)
        })

        app.delete("/reviews/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await reviewsCollection.deleteOne(query);
            return res.send(result)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            console.log(email)
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET)
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

    }
    finally {

    }

}

run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send("server is running")
})

app.listen(port, () => {
    console.log(` Server running on ${port}`);
})