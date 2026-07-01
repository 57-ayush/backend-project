import dotenv from "dotenv"
dotenv.config({
    path: './.env'
})
// import connectDB from "./db/index.js";
import connectDB from "./db/index.js";
import {app} from './app.js'







connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`App Listening on port: ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log('failed to connect with DB',error)
})