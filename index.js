const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jedysg5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const instructorsCollection = client.db("yogaDB").collection("instructors");
    const classesCollection = client.db("yogaDB").collection("classes");
    const usersCollection = client.db("yogaDB").collection("users");
    const purchasesCollection = client.db("yogaDB").collection("purchases");

    // Users api
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User already added" });
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add user" });
      }
    });

    // **Users API - Update User Profile**
    app.put('/users/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
    }

    const query = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            name: updatedData.name,
            email: updatedData.email,
            phoneNumber: updatedData.phoneNumber, 
            address: updatedData.address,
        },
    };
      try {
        const result = await usersCollection.updateOne(query, updateDoc);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: 'Server error', error });
      }
    });
    

    // Instructors apis
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    app.get("/instructors/:id", async (req, res) => {
      const instructorId = req.params.id;

      // Validate the ID before using it
      if (!ObjectId.isValid(instructorId)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }

      try {
        const instructor = await instructorsCollection.findOne({
          _id: new ObjectId(instructorId),
        });

        if (!instructor) {
          return res.status(404).send({ message: "Instructor not found" });
        }

        res.send(instructor);
      } catch (error) {
        console.error("Error fetching instructor:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // Classes apis
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;

      const classQuery = { _id: new ObjectId(id) };
      const classItem = await classesCollection.findOne(classQuery);
      const { instructor } = classItem;

      const query = { name: instructor };
      const instructorItem = await instructorsCollection.find(query).toArray();
      res.send({ classItem, instructorItem });
    });

    // Cart API

    app.get("/purchases", async (req, res) => {
      const result = await purchasesCollection.find().toArray();
      res.send(result);
    });

    // API to get purchases class
    app.get("/purchases/:email", async (req, res) => {
      const email = req.params.email;

      try {
        const purchases = await purchasesCollection.find({ email }).toArray();

        // Populate the class details for each purchase
        const classIds = purchases.map(
          (purchase) => new ObjectId(purchase.classId)
        );
        const bookedClasses = await classesCollection
          .find({ _id: { $in: classIds } })
          .toArray();

        res.status(200).json(bookedClasses);
      } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // API to delete a selected class
    app.delete("/purchases/:id", async (req, res) => {
      const purchaseId = req.params.id;
      console.log(purchaseId);

      try {
        const result = await purchasesCollection.deleteOne({
          classId: new ObjectId(purchaseId),
        });
        if (result.deletedCount === 1) {
          console.log("success");
          res.status(200).json({ message: "Class removed successfully" });
        } else {
          console.log("Error 1", result.deletedCount);
          res.status(404).json({ message: "Class not found" });
        }
      } catch (error) {
        console.error("Error deleting class:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/purchase", async (req, res) => {
      const { classId, email } = req.body;

      try {
        // Find the class by ID
        const classItem = await classesCollection.findOne({
          _id: new ObjectId(classId),
        });

        if (!classItem) {
          return res.status(404).json({ message: "Class not found" });
        }

        // Check if the user has already purchased the class
        const existingPurchase = await purchasesCollection.findOne({
          classId: new ObjectId(classId),
          email: email,
        });

        if (existingPurchase) {
          return res
            .status(400)
            .json({ message: "You have already enrolled in this class." });
        }

        // Check if there are seats available
        if (classItem.studentsEnrolled >= classItem.totalSeats) {
          return res.status(400).json({ message: "No seats available" });
        }

        // Update the studentsEnrolled count
        const updatedClass = await classesCollection.updateOne(
          { _id: new ObjectId(classId) },
          { $inc: { studentsEnrolled: 1 } }
        );

        // Record the purchase in the database
        const newPurchase = {
          classId: new ObjectId(classId),
          email: email,
          purchaseDate: new Date(),
        };
        await purchasesCollection.insertOne(newPurchase);

        res.status(200).json({
          message: "Purchase successful",
          success: true,
          studentsEnrolled: classItem.studentsEnrolled + 1,
          totalSeats: classItem.totalSeats,
        });
      } catch (error) {
        console.error("Error during purchase:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Get classes by instructor id
    app.get("/instructors/classes/:id", async (req, res) => {
      const instructorId = req.params.id;
      const instructorQuery = { _id: new ObjectId(instructorId) };

      const instructor = await instructorsCollection.findOne(instructorQuery);
      const { name } = instructor;

      const query = { instructor: name };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // Get instructor details by class id
    app.get("/classes/instructors/:id", async (req, res) => {
      const classId = req.params.id;
      const classQuery = { _id: new ObjectId(classId) };

      const classItem = await classesCollection.findOne(classQuery);
      const { instructor } = classItem;

      const query = { name: instructor };
      const result = await instructorsCollection.find(query).toArray();
      res.send(result);
    });

    // Send ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
