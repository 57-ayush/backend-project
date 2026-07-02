import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

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

})

export { registerUser };