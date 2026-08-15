export type LoginPayload = {
    email : string ;
    password : string;
}

export type LogoutPayload = {
    rf_token : string;
}

export type ForgotPasswordPayload = {
    email : string;
}

export type ChangePasswordPayload = {
    old_password : string;
    new_password : string;
    confirm_password : string;
}

export type SignupPayload = {
    email : string;
    name : string;
    password : string;
    phone : number;
    confirm_password : string;
}

export type ResetPasswordPayload = {
    email : string;
    otp : string;
    new_password : string;
    hash : string;
    expiresAt : number;
}

