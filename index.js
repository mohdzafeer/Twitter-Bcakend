require('dotenv').config();
const express = require('express')
const cors = require('cors');
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();
    const postCollection = client.db('database').collection('posts')
    const userCollection = client.db('database').collection('users')
    // get
    app.get('/post', async (req, res) => {
      const post = (await postCollection.find().toArray()).reverse();
      res.send(post)
    })
    app.get('/user', async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user)
    })

    app.get('/loggedInUser', async (req, res) => {
      const email = req.query.email;
      const user = await userCollection.find({ email: email }).toArray()
      res.send(user)
    })
    app.get('/userPost', async (req, res) => {
      const email = req.query.email;
      const post = (await postCollection.find({ email: email }).toArray()).reverse();
      res.send(post)
    })



    // post
    app.post('/post', async (req, res) => {
      const post = req.body;
      const result = await postCollection.insertOne(post);
      res.send(result);
    })
    app.post('/register', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })








    // patch Method
    app.patch('/userUpdates/:email', async (req, res) => {
      const filter = req.params;
      const profile = req.body
      const options = { upsert: true }
      const updateDoc = { $set: profile }
      const result = await userCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })




    app.post('/lastUser', async (req, res) => {
      try {
        const database = client.db('database'); 
        const collectionName = 'lastUser'; 
        const userCollection = database.collection(collectionName);
    
        const newData = req.body;
    
        const result = await userCollection.insertOne(newData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error adding data', error });
      }
    });
    

    app.get('/lastUser', async (req, res) => {
      try {
        const database = client.db('database'); 
        const collectionName = 'lastUser'; 
        const userCollection = database.collection(collectionName);
    
        const data = (await userCollection.find({}).toArray()).reverse();
        res.send(data);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching data', error });
      }
    });



    console.log("Connected to MongoDB!");
  } catch (err) {
    console.log(err)
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Twitter Backend')
})




// Stripe Server

app.get('/', (req, res) => {
  res.send('Stripe backend');
});

app.post("/subscription", async (req, res) => {
  const { amount,plan_name,details } = req.body;
  try {
    const product = await stripe.products.create({
      name: `${plan_name}`,
      description:`${details}`, 
      images:[`https://i.ibb.co/GvgZLLD/favicon.webp`],      
      type: 'service',
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'inr',
    });


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],

      line_items: [
        {
          price: price.id,
          quantity: 1,
          // description:`Basic Plan \n Boost small reply`
          // price_data:`Basic Plan`
        },
      ],
      mode: 'payment',
      success_url: 'https://zafeer-twitter-nullclass-i-git-b91145-mohammad-zafeers-projects.vercel.app/premium/success',
      cancel_url: 'https://zafeer-twitter-nullclass-i-git-b91145-mohammad-zafeers-projects.vercel.app/premium/failed',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'IN'],
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Stripe Server






// OTP Server

let otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'twitter.nullclass.zafeer.intern@gmail.com',
    pass: 'itcmrfoddwsfirti'
  }
});




app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send({ error: 'Email is required' });
  }

  const otp = generateOTP();
  otpStore[email] = otp;

  const mailOptions = {
    from: 'twitter.nullclass.zafeer.intern@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending OTP email:', error);
      return res.status(500).send({ error: 'Failed to send email' });
    }
    res.status(200).send({ message: 'OTP sent' });

  });

  console.log(`Generated OTP for ${email}: ${otp}`);
  console.log('Current OTP Store:', otpStore);

  res.status(200).send({ message: 'OTP sent' });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  console.log('Received payload:', req.body);



  const storedOtp = otpStore[email];
  console.log(`Stored OTP for ${email}: ${storedOtp}, Received OTP: ${otp}`);

  if (storedOtp && storedOtp === otp) {
    delete otpStore[email];
    return res.status(200).send({ message: 'OTP verified' });

  }
  else {
    res.status(400).send({ error: 'Invalid OTP' });

  }
});

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// OTP Server







// PORT
app.listen(port, () => {
  console.log(`Twitter listening on port ${port}`)
})



