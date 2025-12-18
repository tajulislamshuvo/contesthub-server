const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000


// middleware
app.use(express.json());
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@first-project.21znaun.mongodb.net/?appName=first-project`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('contesthub_db');
    const userCollection = db.collection('users');
    const contestCollection = db.collection('contests');


    // users api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      user.role = 'user';
      user.createdAt = new Date();

      const userExist = await userCollection.findOne({ email: user.email });
      if (userExist) {
        return res.send({ message: 'user already exist' })
      }

      const result = await userCollection.insertOne(user);
      res.send(result)
    })


    // =================== contest related api ================
    app.get('/contests', async (req, res) => {
      const { status } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }

      const result = await contestCollection.find(query).toArray();

      res.send(result);
    })
    // get single contest by id
    app.get('/contests/:id', async (req, res) => {
      const { id } = req.params;
      const objId = new ObjectId(id);
      const result = await contestCollection.findOne({ _id: objId });
      res.send(result)

    })
    app.get('/popular-contests', async (req, res) => {
      const { status } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }

      const result = await contestCollection.find(query).sort({
        participantsCount: -1
      }).limit(6).toArray();

      res.send(result);
    })

    app.post('/contests', async (req, res) => {
      const contest = req.body;
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    })

    app.patch('/contest/:id/status', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const statusInfo = req.body;
      const updateStatus = {
        $set: {
          status: statusInfo.status
        }
      }

      const result = await contestCollection.updateOne(query, updateStatus);
      res.send(result)
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

app.get('/', (req, res) => {
  res.send('Contest is loading')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
