import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js"

const registerUser= asyncHandler (async (req,res)=>{
    //get user details from front end
    //validation not empty
    //check if user already exist
    //check for image and avatar
    // upload them to the couldinary avtar
    //create user object and entry in the database
    //remove password and refresh token field from response
    // check for the user creation
    //return response

    const {fullName,username,password,email}= req.body
    console.log('the email is ', email)

    if(
        [fullName,username,password,email].some((field)=> field?.trim() === "")
    ){
        throw new apiError(400,"all fields are required")
    }
    const existedUser = User.findOne({
        $or:[{ email },{ username }]
    })
    if(existedUser){
        throw new apiError(409,"user already existed")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new apiError(400,"avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new apiError(400,"avatar file is required")
    }

    const user  = await user.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await user.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new apiError(500,"something went wrong while regestering the user")
    }
    return res.status(201).json(
        new apiResponse(200,createdUser,"user registerd successsfully")
    )
    

    
} )

export {registerUser}