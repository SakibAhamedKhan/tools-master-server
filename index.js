const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wr58j.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
	try{
		await client.connect();
		const toolsCollections = client.db('tool_master_db').collection('tools');
		const usersCollections = client.db('tool_master_db').collection('users');
		const ordersCollections = client.db('tool_master_db').collection('orders');
		const paymentsCollections = client.db('tool_master_db').collection('payments');
		const reviewsCollections = client.db('tool_master_db').collection('reviews');

		console.log('mongodb connected');

		// get all tools
		app.get('/tools', async(req, res) => {
			const result = await toolsCollections.find().toArray();
			res.send(result);
		})

		// add user 1st time when they signup
		app.put('/user/:email', async(req, res) => {
			const email = req.params.email;
			const user = req.body;
			const filter = {email: email};
			const optoins = {upsert: true};
			const updatedDocument = {
				$set: user
			}
			const result = await usersCollections.updateOne(filter, updatedDocument, optoins);
			const token = jwt.sign({email: email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
			res.send({result, token});
		})
		
		// get tools by id
		app.get('/tools/:id', async(req,res) => {
			const id = req.params.id;
			const query = {_id: ObjectId(id)}
			const result = await toolsCollections.findOne(query);
			res.send(result);
		})
		
		// order in tools
		app.post('/orders', async(req,res) => {
			const doc = req.body;
			const result = await ordersCollections.insertOne(doc);
			res.send(result);
		})
	
		// get order by user email
		app.get('/myorders/:email', async(req, res) => {
			const email = req.params.email;
			const query = {email:email};
			const result = await ordersCollections.find(query).toArray();
			res.send(result);
		})
		
		// get order by id
		app.get('/orders/:id', async(req, res) => {
			const id = req.params.id;
			const query = {_id: ObjectId(id)};
			const result = await ordersCollections.findOne(query);
			res.send(result);
		})

		// make payment in stripe
		app.post("/create-payment-intent", async (req, res) => {
			const {price} = req.body;
			const amount = parseInt(price) * 1000;
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types:['card']
			});
			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		})
		// after payment 
		app.patch('/paymentOrders/:id', async(req, res) => {
			const id = req.params.id;
			const payment = req.body;
			console.log(payment);
			const filter = {_id: ObjectId(id)};
			const updatedDoc = {
				$set: {
					paid: true,
					transactionId: payment.transactionId,
				}
			}
			const updatedOrders = await ordersCollections.updateOne(filter, updatedDoc);
			const result = await paymentsCollections.insertOne(payment);
			res.send(updatedOrders);
		})

		// cancel order by user
		app.delete('/myorders/:id', async(req, res) => {
			const id = req.params.id;
			const query = {_id: ObjectId(id)};
			const result = await ordersCollections.deleteOne(query);
			res.send(result);
			// res.send({message:'ok'});
		})

		// Add a review by user
		app.post('/addreview', async(req, res) => {
			const doc = req.body;
			const result = await reviewsCollections.insertOne(doc);
			res.send(result);
		})

		// update user profile
		app.put('/profile/:email', async(req, res) => {
			const email = req.params.email;
			const doc = req.body;
			const filter = {email: email};
			const updateDoc = {
				$set: doc
			}
			const result = await usersCollections.updateOne(filter,updateDoc);
			res.send(result);
		})

	}
	finally{

	}
}
run().catch(console.dir);




app.get('/', (req, res) => {
	res.send(`Tool Master Server running on port ${port}`);
  })
  
app.listen(port, () => {
console.log(`Tools Master server running on port ${port}`);
})