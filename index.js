const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config()
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;


// 

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.agcun.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
  if(req.headers?.authorization?.startsWith('Bearer ')) {
    const token =  req.headers.authorization.split(' ')[1];


    try{
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}




async function run(){
  try{
      await client.connect();
      console.log('database connected');
      const database = client.db('cars_hub')
      const carsCollection = database.collection('cars');
      const usersCollection = database.collection('users');
      const reviewCollection = database.collection('reviews')
      
      //cars for getting
      app.get('/cars', async (req, res) =>{
        const email = req.query.email;
        const query = { email: email}
        const cursor = carsCollection.find(query);
        const cars = await cursor.toArray();
        res.json(cars);
      })

      
      
      //cars for post
      app.post('/cars', async (req, res) =>{
        const car = req.body;
        const result = await carsCollection.insertOne(car);
   
        res.json(result)
      });

      //get for users verification
      app.get('/users/:email', async (req, res)=>{
        const email = req.params.email;
        const query = {email: email};
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user?.role === 'admin'){
          isAdmin = true;
        }
        res.json({admin: isAdmin});
      })

      // post for users
      app.post('/users', async(req, res) =>{
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);
      });

      app.put('/users', async(req, res) =>{
        const user = req.body;
        const filter = {email: user.email};
        const options ={upsert: true};
        const updateDoc = {$set: user};
        const result =await usersCollection.updateOne(filter, options, updateDoc);
        res.json(result);
      })

      //for admin
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        console.log('decoded', req.decodedEmail);
        const requester = req.decodedEmail;

        if(requester){
          const  requesterAccount = await usersCollection.findOne({email: requester});
          if(requesterAccount.role === 'admin'){
            const filter = {email: user.email};
            const updateDoc = { $set: {role: 'admin'} };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
          }
        }
        else{
          res.status(403).json({message: 'you havnt access to make an admin'})
        }

      })
  }
  finally{

  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Hello cars!')
})

app.listen(port, () => {
  console.log(` listening at http://localhost:${port}`)
})