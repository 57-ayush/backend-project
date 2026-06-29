import {v2 as couldinary} from "cloudinary"
import fs from "fs"

couldinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;

        const response= await couldinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
    
        fs.unlink(localFilePath)
        return response;
    } 
    catch (error) {
        fs.unlinkSync(localFilePath)
        return nulll
    }
    }
        
    

    export {uploadOnCloudinary}

   