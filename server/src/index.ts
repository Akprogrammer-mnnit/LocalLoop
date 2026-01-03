import {server} from "./app";
import connectDB from "./DB";


connectDB()
.then(()=>{
    server.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });

})
.catch((error)=>{
    console.log("Error while starting: ",error);
})