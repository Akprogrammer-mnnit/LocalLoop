import { server } from "./app";
import connectDB from "./DB";
import { Tunnel } from "./models/tunnel.model";

connectDB()
    .then(async () => {
        try {
            await Tunnel.updateMany({}, { isActive: false });
            console.log("🧹 Reset all tunnels to inactive state");
        } catch (error) {
            console.error("⚠️ Failed to reset tunnel statuses:", error);
        }

        server.listen(process.env.PORT || 3000, () => {
            console.log(`Server is running on port ${process.env.PORT || 3000}`);
        });
    })
    .catch((error) => {
        console.log("Error while starting: ", error);
        process.exit(1);
    })