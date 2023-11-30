const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET)

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fz8oxax.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const campCollection = client.db('medicoDB').collection('camps');
    const reviewCollection = client.db('medicoDB').collection('reviews');
    const userCollection = client.db('medicoDB').collection('users');
    const regCampCollection = client.db('medicoDB').collection('regCamp');
    const paymentsCollection = client.db('medicoDB').collection('payments');




    // verifyToken 
    const verifyToken = (req, res, next) => {
      console.log('inside verify:', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyOrganizer = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email };
      const user = await userCollection.findOne(query)
      const isOrganizer = user?.role === 'organizer'
      if (!isOrganizer) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    const verifyParticipant = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email };
      const user = await userCollection.findOne(query)
      const isParticipant = user?.role === 'participant'
      if (!isParticipant) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    const verifyProfessional = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email };
      const user = await userCollection.findOne(query)
      const isProfessional = user?.role === 'professional'
      if (!isProfessional) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }


    // jwt 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '2h'
      })
      res.send({ token })
    })

    // camps 
    app.get('/camps', async (req, res) => {
      const result = await campCollection.find().toArray();
      res.send(result)
    })

    app.delete('/camps/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.deleteOne(query)
      res.send(result)
    })

    app.post('/camps', verifyToken, verifyOrganizer, async (req, res) => {
      const item = req.body
      const result = await campCollection.insertOne(item);
      res.send(result)
    })
    app.get('/camps/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.findOne(query)
      res.send(result)
    })

    app.patch('/camps/:id',async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          campName: item.campName,
          servicesProvided: item.servicesProvided,
          healthcareProfessionals: item.healthcareProfessionals,
          targetAudience: item.targetAudience,
          location: item.location,
          longDescription: item.longDescription,
          dateAndTime: item.dateAndTime,
          campFees: item.campFees,
          image: item.image,
        }
      }
      const result = await campCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    // user 
    app.patch('/users/:email',verifyToken,async (req, res) => {
      const item = req.body;
      const email = req.params.email;
      const filter = { email: email }
      const updateDoc = {
        $set: {
          name: item.name,
          image: item.image,
        }
      }
      const result = await userCollection.updateOne(filter,updateDoc)
      res.send(result)
    })



    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return res.send({ message: 'user exist' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/getUsers/:email', async (req, res) => {
      const email = req.params.email;
      // console.log('email from backend',email);
      const query = {email: email}
      const result = await userCollection.findOne(query);
      res.send(result)
    })


    app.get('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.send({ message: 'Unauthorized access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let organizer = false;
      if (user) {
        organizer = user?.role === 'organizer'
      }
      if (user) {
        professional = user?.role === 'professional'
      }
      if (user) {
        participant = user?.role === 'participant'
      }
      res.send({ organizer, professional, participant })
    })



    // reg camps 
    app.post('/reg-camps',verifyToken,verifyParticipant, async (req, res) => {
      const item = req.body
      console.log('from backend', item);
      const result = await regCampCollection.insertOne(item);
      res.send(result)
    })
  //   app.post('/reg-camps/:campId', verifyToken,verifyParticipant, async (req, res) => {
  //     const item = req.body;
  //     const campId = req.params.campId;
  //     const result = await regCampCollection.insertOne({ ...item, regCampId: campId });
  //     res.send(result);
  // });

    app.get('/reg-camps/',verifyToken, async (req, res) => {
      const result = await regCampCollection.find().toArray();
      res.send(result)
    })

    // app.get('/reg-camps/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await regCampCollection.findOne(query)
    //   res.send(result)
    // })

    // reviews 
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })


    // payment api 
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    app.post('/payments',async(req,res)=>{
      const payment = req.body
      const result = await paymentsCollection.insertOne(payment)
      res.send(result)
    })
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('medico is running')
})

app.listen(port, () => {
  console.log(`Medico is running on port ${port}`);
})