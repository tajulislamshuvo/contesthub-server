const express = require('express')
const cors = require('cors');
const app = express()
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

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
    const paymentCollection = db.collection('payment');
    const submissionCollection = db.collection('submissions');


    // users api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/:email/role', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await userCollection.findOne(query);
      res.send({ role: user?.role || 'user' })
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

    app.patch('/user/:id/role', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const roleInfo = req.body;
      const updateRole = {
        $set: {
          role: roleInfo.role
        }
      }

      const result = await userCollection.updateOne(query, updateRole);
      res.send(result)
    })




    // =================== contest related api ================
    app.get('/contests', async (req, res) => {
      const { status, creatorEmail } = req.query;
      const query = {};
      if (status) {
        query.status = status;
      }
      if (creatorEmail) {
        query.creatorEmail = creatorEmail
      }

      const result = await contestCollection.find(query).sort({ createdAt: -1 }).toArray();

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

    app.patch('/contests/edit/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const editInfo = req.body;
      const updateEditInfo = {
        $set: {
          name: editInfo.name,
          image: editInfo.image,
          description: editInfo.description,
          price: editInfo.price,
          prize: editInfo.prize,
          instruction: editInfo.instruction,
          type: editInfo.type,
          startTime: editInfo.startTime,
          endTime: editInfo.endTime
        }
      }

      const result = await contestCollection.updateOne(query, updateEditInfo);
      res.send(result)
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



    app.delete('/contest/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(query);
      res.send(result)
    })


    // ============== COntest submission =================
    // app.get('/submissions/:id', async (req, res) => {
    //   const { id } = req.params;
    //   const query = { contestId: new ObjectId(id) };
    //   const result = await submissionCollection.find(query).toArray();
    //   res.send(result)
    // })

    app.get('/contest-winner', async (req, res) => {
      const winner = await submissionCollection.find({ isWinner: true }).sort({ createdAt: -1 }).limit(6).toArray();
      res.send(winner)
    })


    app.get('/submissions/contest/:contestId', async (req, res) => {
      const { contestId } = req.params;



      const submissions = await submissionCollection
        .find({ contestId: contestId })
        .toArray();

      res.send(submissions);
    });



    app.post('/submissions', async (req, res) => {
      const submission = req.body;

      const existingSubmission = await submissionCollection.findOne({
        contestId: submission.contestId, participantEmail: submission.participantEmail
      });
      if (existingSubmission) {
        return res.status(409).send({ message: 'submission already submit' })
      }

      const result = await submissionCollection.insertOne(submission);
      res.send(result);
    })

    app.patch('/submission/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const editInfo = req.body;
      const updateWinnerInfo = {
        $set: {
          isWinner: editInfo.isWinner,

        }
      }

      const result = await submissionCollection.updateOne(query, updateWinnerInfo);
      res.send(result)
    })

    app.patch('/submissions/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const editInfo = req.body;
      const updateSubmitInfo = {
        $set: {
          submissionData: editInfo.submissionData,


        }
      }

      const result = await submissionCollection.updateOne(query, updateSubmitInfo);
      res.send(result)



    })


    app.get('/submissions/:email', async (req, res) => {
      const { email } = req.params;



      const submissions = await submissionCollection
        .find({ participantEmail: email })
        .toArray();

      res.send(submissions);
    });


    app.delete('/submission/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await submissionCollection.deleteOne(query);
      res.send(result)
    })


    //=============== Payment related apis ==============
    app.get('/transaction/:email', async (req, res) => {
      const { email } = req.params;



      const transaction = await paymentCollection
        .find({ customerEmail: email })
        .toArray();

      res.send(transaction);
    });



    app.get('/payments', async (req, res) => {
      const { customerEmail, contestId } = req.query;
      const query = {};
      if (customerEmail) {
        query.customerEmail = customerEmail
      }
      if (contestId) {
        query.contestId = contestId
      }

      const result = await paymentCollection.findOne(query);
      res.send(result)
    })



    app.post('/create-checkout-session', async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.price) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {

            price_data: {
              currency: 'USD',
              unit_amount: amount,
              product_data: {
                name: paymentInfo.contestName
              }
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.participant_email,
        mode: 'payment',
        metadata: {
          contestId: paymentInfo.contestId,
          contestName: paymentInfo.contestName
        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });

      console.log(session);
      res.send({ url: session.url })
    })

    // payment success
    app.patch('/payment-success', async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('session retrive', session)


      const existingPayment = await paymentCollection.findOne({
        transectionId: session.payment_intent,
      });

      if (existingPayment) {
        return res.send({ message: 'Payment already processed' });
      }

      if (session.payment_status === 'paid') {
        const id = session.metadata.contestId;
        const query = { _id: new ObjectId(id) }

        const update = {
          $inc: {
            participantsCount: 1
          }
        }

        const result = await contestCollection.updateOne(query, update)

        const payment = {
          amount: session.amount_total / 100,
          currency: session.currency,
          customerEmail: session.customer_email,
          contestId: session.metadata.contestId,
          contestName: session.metadata.contestName,
          transectionId: session.payment_intent,
          paymentStatus: session.payment_status,
          paidAt: new Date()

        }

        if (session.payment_status === 'paid') {
          const resultPayment = await paymentCollection.insertOne(payment);
          res.send({ success: true, paymentInfo: resultPayment })
        }


      }


      res.send({ success: true })
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
