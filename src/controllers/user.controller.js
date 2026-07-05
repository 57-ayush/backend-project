import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const generateAccessTokenAndRefreshToken= async(userId)=>{
    try {
        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generaterRefreshToken()
        
        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new apiError(500,"something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, password, email } = req.body;
    console.log("FILES RECEIVED:", req.files);

    if (
        [fullName, username, password, email].some((field) => field?.trim() === "")
    ) {
        throw new apiError(400, "all fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new apiError(409, "user already existed");
    }

    // 1. Safely extract avatar path
    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    // 2. Fixed the typo: changed req.file to req.files
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    // Only attempt upload if the cover image path exists
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new apiError(400, "avatar upload failed on Cloudinary");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // 3. Fixed the query: use User.findById(), not user.findById()
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new apiError(500, "something went wrong while registering the user");
    }

    return res.status(201).json(
        new apiResponse(201, createdUser, "user registered successfully")
    );
});

const loginUser = asyncHandler(async (req,res)=>{
    const {username,email,password}= req.body

    if(!username && !email){
        throw new apiError(400,"username or email required")
    }

    const user=User.findOne({
        $or:[{email},{username}]
    })

    if(!user){
        throw new apiError(404,"user does not exist")
    }
    const isPasswordValid= await user.isPasswordValid(password)
    
    if(!isPasswordValid){
        throw new apiError(401,"please enter correct user credentials")

    }

    const {accessToken, refreshToken}= await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser= await User.findById(user._id).select(
        "-password -refreshtoken"
    )
    const options={
        httpOnly: true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new apiResponse(
            200,{},"user loggedout"
        )
    )
})

const refreshAccessToken= asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401,"unauthorized access")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError(401,"invalid refresh token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401,"token has been used or expired")
        }
        const options={
            httpOnly:true,
            secure:true
        }

        const { accessToken,newrefreshToken }=await generateAccessTokenAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options) 
        .cookie("refreshToken",newrefreshToken,options) 
        .json(
            new apiResponse(
                200,
                {accessToken, refreshToken:newrefreshToken},
                "access token refreshed"

            )
        )
        
    } catch (error) {
        throw new apiError(401, error?.message || "invalid refresh token")
    }
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken

 };