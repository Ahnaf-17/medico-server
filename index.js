const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();

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
    await client.connect();

    const campCollection = client.db('medicoDB').collection('camps');
    const reviewCollection = client.db('medicoDB').collection('reviews');
    const userCollection = client.db('medicoDB').collection('users');




    // verifyToken 
    const verifyToken = (req, res, next) => {
      console.log('inside verify:',req.headers.authorization);
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
//  const verifyToken = (req,res,next) =>{
//   console.log('inside verify token',req.headers);
//   next()
//   if(!req.headers.authorization){
//     return res.status(401).send({message: 'unauthorized access'})
//   }
//   const token = req.headers.authorization.split(' ')[1];
//   jwt.verify(token,process.env.ACCESS_TOKEN,())
//  }



    // jwt 
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{
        expiresIn: '2h'
      })
      res.send({token})
    })

    // camps 
    app.get('/camps',verifyToken,async(req,res)=>{
      
      const result = await campCollection.find().toArray();
      res.send(result)
    })
    app.delete('/camps/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result = await campCollection.deleteOne(query)
      res.send(result)
    })

    // reviews 
    app.get('/reviews',async(req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result)
    })

  

    //users
    app.post('/users',async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existUser = await userCollection.findOne(query);
      if(existUser){
        return res.send({message: 'user exist'})
      }
      const result = await userCollection.insertOne(user);
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
    res.send('medico is running')
  })
  
  app.listen(port, () => {
    console.log(`Medico is running on port ${port}`);
  })