import mongoose from "mongoose";
import dotenv from "dotenv"
dotenv.config()
const DB_NAME = "LOOPLOCAL"
const connectDB = async () => {
    try {
        const response = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("Mongo DB is connected on the host ", response.connection.host)

    } catch (error) {
        console.log(`MongoDB connection error ${error}`)
        process.exit(1);
    }
}

export default connectDB