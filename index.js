const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000 ;


// Middleware
app.use(express.json());
app.use(cors());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jedysg5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const instructorsCollection = client.db('yogaDB').collection('instructors');
    const classesCollection = client.db('yogaDB').collection('classes');
    app.get('/instructors', async(req, res) => {
        const result = await instructorsCollection.find().toArray();
        res.send(result);
    });

    app.get('/instructors/:id', async (req, res) => {
        const instructorId = req.params.id;
      
        // Validate the ID before using it
        if (!ObjectId.isValid(instructorId)) {
          return res.status(400).send({ error: 'Invalid ID format' });
        }
      
        try {
          const instructor = await instructorsCollection.findOne({
            _id: new ObjectId(instructorId),
          });
      
          if (!instructor) {
            return res.status(404).send({ message: 'Instructor not found' });
          }
      
          res.send(instructor);
        } catch (error) {
          console.error('Error fetching instructor:', error);
          res.status(500).send({ error: 'Internal Server Error' });
        }
      });

    app.get('/classes', async(req, res) => {
        const result = await classesCollection.find().toArray();
        res.send(result);
    });

    app.get('/classes/:id', async(req, res) => {
      const id = req.params.id;

      const classQuery = { _id: new ObjectId(id)};
      const classItem = await classesCollection.findOne(classQuery);
      const { instructor } = classItem;

      const query = {name: instructor}
      const instructorItem = await instructorsCollection.find(query).toArray();
      res.send({classItem, instructorItem});
    });

    app.get('/instructors/classes/:id', async(req, res) => {
        const instructorId = req.params.id;
        const instructorQuery = { _id: new ObjectId(instructorId)}

        const instructor = await instructorsCollection.findOne(instructorQuery);
        const { name } = instructor;

        const query = {instructor: name}
        const result = await classesCollection.find(query).toArray();
        res.send(result);
    });
    
    app.get('/classes/instructors/:id', async(req, res) => {
        const classId = req.params.id;
        const classQuery = { _id: new ObjectId(classId)}

        const classItem = await classesCollection.findOne(classQuery);
        const { instructor } = classItem;

        const query = {name: instructor}
        const result = await instructorsCollection.find(query).toArray();
        res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})