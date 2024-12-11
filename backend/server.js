const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

//console.log("url: ", process.env.MONGO_DB_URI);

mongoose.connect(process.env.MONGO_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seatSchema = new mongoose.Schema({
  row: Number,
  seatNumber: Number,
  status: { type: String, default: "available" },
});

const Seat = mongoose.model("Seat", seatSchema);

// Initialize seats if not already initialized
const initializeSeats = async () => {
  const count = await Seat.countDocuments();
  if (count === 0) {
    const seats = [];
    for (let i = 1; i <= 80; i++) {
      seats.push({
        row: Math.ceil(i / 7),
        seatNumber: i,
        status: "available",
      });
    }
    await Seat.insertMany(seats);
  }
};
initializeSeats();

app.get("/seats", async (req, res) => {
  const seats = await Seat.find();
  res.json(seats);
});

app.post("/reserve", async (req, res) => {
  const { numSeats } = req.body;
  if (numSeats < 1 || numSeats > 7)
    return res.status(400).send("Invalid number of seats.");

  const seats = await Seat.find({ status: "available" }).sort({
    row: 1,
    seatNumber: 1,
  });
  if (seats.length < numSeats)
    return res.status(400).send("Not enough seats available.");

  let bookedSeats = [];
  for (let row = 1; row <= 12; row++) {
    const rowSeats = seats.filter((seat) => seat.row === row);
    if (rowSeats.length >= numSeats) {
      bookedSeats = rowSeats.slice(0, numSeats);
      break;
    }
  }

  if (bookedSeats.length === 0) bookedSeats = seats.slice(0, numSeats);

  await Promise.all(
    bookedSeats.map((seat) =>
      Seat.updateOne(
        { seatNumber: seat.seatNumber },
        { $set: { status: "booked" } }
      )
    )
  );

  res.json(bookedSeats.map((seat) => seat.seatNumber));
});

app.post("/reset", async (req, res) => {
    try {
        const result = await Seat.updateMany({}, { $set: { status: "available" } });
        console.log("Reset operation result:", result); // Log operation result for debugging
        res.send("All seats have been reset.");
    } catch (error) {
        console.error("Error resetting seats:", error); // Log the error
        res.status(500).send("Error resetting seats.");
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
