const express = require('express');
require('dotenv').config()
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const jwt = require('jsonwebtoken');
const cors = require('cors');
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`Car Doctor server is running at: ${port}`)
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5xew4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        res.status(401).send({error: true, message: "Unauthorized Aceess"});
    }
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=> {
        if(error){
            return res.status(403).send({error: true, message: "Unauthorized Access"});
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctor").collection("services");
        const checkoutCollection = client.db("carDoctor").collection("checkouts");

        //jwt
        app.post('/jwt', (req, res)=> {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
            res.send({token});
        })

        //get all services
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        //get a specific service via id
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })

        //get all checkout data
        app.get('/checkouts', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log("comeback:", decoded);
            if(decoded.email !== req.query.email){
                return res.status(403).send({error: true, message: "Forbidden Access"});
            }
            // console.log(req.headers.authorization);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email };
            }
            const cursor = checkoutCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        //post data to checkout collection
        app.post('/checkouts', async (req, res) => {
            const checkout = req.body;

            const result = await checkoutCollection.insertOne(checkout);
            res.send(result);
        })

        //delete a specific checkout
        app.delete('/checkouts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await checkoutCollection.deleteOne(query);
            res.send(result);
        })

        //update a specific checkout data
        app.patch('/checkouts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const update = req.body;
            const updateCheckout = {
                $set: {
                    status: update.status,
                },
            };
            const result = await checkoutCollection.updateOne(filter, updateCheckout);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log("Server is running at: ", port);
})