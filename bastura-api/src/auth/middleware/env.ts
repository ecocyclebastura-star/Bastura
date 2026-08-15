if (!process.env.JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET tidak terdefinisi di file .env");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("FATAL ERROR: JWT_REFRESH_SECRET tidak terdefinisi di file .env");
}

if (!process.env.OTP_SECRET){
    throw new Error("FATAL ERROR: OTP_SECRET tidak terdefinisi di file .env");
}

if (!process.env.RESEND_API_KEY) {
    throw new Error("FATAL ERROR: RESEND_API_KEY tidak terdefinisi di file .env");
}

export const getEnvJWT =  {
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
}

export const getEnvOTP = {
    OTP_SECRET: process.env.OTP_SECRET as string,
    RESEND_API_KEY: process.env.RESEND_API_KEY as string,
}